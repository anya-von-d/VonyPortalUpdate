import React, { useState, useEffect } from "react";
import { Loan, Payment, User, LoanAgreement, PublicProfile, Friendship, VenmoConnection, PayPalConnection } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  Clock, Calendar, DollarSign, AlertCircle, FileText, BarChart3,
  Pencil, X, FolderOpen, ClipboardList, Info, Check, Shield, Smartphone, CreditCard, Banknote, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, addMonths, addWeeks } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";

import LoanCard from "@/components/loans/LoanCard";
import RecordPaymentModal from "@/components/loans/RecordPaymentModal";
import LoanDetailsModal from "@/components/loans/LoanDetailsModal";
import MyLoanOffers from "@/components/dashboard/MyLoanOffers";
import BorrowerSignatureModal from "@/components/loans/BorrowerSignatureModal";

export default function Borrowing() {
  const [loans, setLoans] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loanToCancel, setLoanToCancel] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [manageLoanSelected, setManageLoanSelected] = useState(null);
  const [rankingFilter, setRankingFilter] = useState('highest_interest'); // 'highest_interest', 'highest_payment', 'soonest_deadline'
  const [loanAgreements, setLoanAgreements] = useState([]);
  const [activeDocPopup, setActiveDocPopup] = useState(null);
  const [docPopupAgreement, setDocPopupAgreement] = useState(null);
  const [activeInfoTooltip, setActiveInfoTooltip] = useState(null);
  const [quickPayAmount, setQuickPayAmount] = useState('');
  const [quickPayMethod, setQuickPayMethod] = useState('');
  const [quickPayLoanId, setQuickPayLoanId] = useState('');
  const [quickPayPerson, setQuickPayPerson] = useState('');
  const [showQuickConfirm, setShowQuickConfirm] = useState(false);
  const [isQuickProcessing, setIsQuickProcessing] = useState(false);
  const [isQuickSuccess, setIsQuickSuccess] = useState(false);
  const [quickPayTransactionId, setQuickPayTransactionId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    let currentUser = null;
    try {
      currentUser = await User.me();
      setUser(currentUser);
    } catch (userError) {
      console.log("User not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      const [allLoans, allProfiles, allAgreements] = await Promise.all([
        Loan.list('-created_at').catch(() => []),
        PublicProfile.list().catch(() => []),
        LoanAgreement.list().catch(() => [])
      ]);

      const userLoans = (allLoans || []).filter(loan =>
        loan.borrower_id === currentUser.id
      );

      setLoans(userLoans);
      setPublicProfiles(allProfiles || []);
      setLoanAgreements(allAgreements || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleMakePayment = (loan) => {
    setSelectedLoan(loan);
    setShowPaymentModal(true);
  };

  const handleViewDetails = (loan) => {
    setSelectedLoanDetails({ loan, type: 'borrowed' });
    setShowDetailsModal(true);
  };

  const handlePaymentComplete = async () => {
    setShowPaymentModal(false);
    setSelectedLoan(null);
    await loadData();
  };

  const PAYMENT_METHOD_LABELS = {
    venmo: 'Venmo', zelle: 'Zelle', cashapp: 'Cash App',
    paypal: 'PayPal', cash: 'Cash', other: 'Other'
  };

  const generateTransactionId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VNY-${timestamp}-${random}`.toUpperCase();
  };

  const handleQuickPaySubmit = () => {
    setShowQuickConfirm(true);
  };

  const handleQuickPayConfirm = async () => {
    setIsQuickProcessing(true);
    try {
      const loan = activeLoans.find(l => l.id === quickPayLoanId);
      if (!loan) return;

      const txnId = generateTransactionId();
      setQuickPayTransactionId(txnId);
      const methodLabel = PAYMENT_METHOD_LABELS[quickPayMethod] || quickPayMethod;

      await Payment.create({
        loan_id: loan.id,
        amount: parseFloat(quickPayAmount),
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: quickPayMethod,
        recorded_by: user?.id,
        status: 'pending_confirmation',
        notes: `${methodLabel} payment of $${parseFloat(quickPayAmount).toFixed(2)} via ${methodLabel} [Ref: ${txnId}]`
      });

      setIsQuickSuccess(true);
      setTimeout(() => {
        setShowQuickConfirm(false);
        setIsQuickSuccess(false);
        setQuickPayAmount('');
        setQuickPayMethod('');
        setQuickPayLoanId('');
        setQuickPayPerson('');
        setQuickPayTransactionId('');
        loadData(false);
      }, 3000);
    } catch (error) {
      console.error("Error recording payment:", error);
    }
    setIsQuickProcessing(false);
  };

  const handleCancelLoan = (loan) => {
    setLoanToCancel(loan);
    setShowCancelDialog(true);
  };

  const confirmCancelLoan = async () => {
    if (!loanToCancel) return;

    try {
      await Loan.update(loanToCancel.id, { status: 'cancelled' });
      const agreements = await LoanAgreement.list();
      const agreement = agreements.find(a => a.loan_id === loanToCancel.id);

      if (agreement) {
        await LoanAgreement.update(agreement.id, {
          cancelled_by: user.full_name,
          cancelled_date: new Date().toISOString(),
          cancellation_note: `Loan Cancelled by ${user.full_name}`
        });
      }

      setShowCancelDialog(false);
      setLoanToCancel(null);
      await loadData();
    } catch (error) {
      console.error("Error cancelling loan:", error);
    }
  };

  const getAgreementForLoan = (loanId) => {
    return loanAgreements.find(a => a.loan_id === loanId);
  };

  const openDocPopup = (type, agreement) => {
    setActiveDocPopup(type);
    setDocPopupAgreement(agreement);
  };

  const closeDocPopup = () => {
    setActiveDocPopup(null);
    setDocPopupAgreement(null);
  };

  const handleEditLoan = (loan) => {
    // Request loan edit - placeholder for now
    alert('Loan edit request functionality coming soon');
  };

  const handleSignOffer = async (loanId, signature) => {
    try {
      await Loan.update(loanId, { status: 'active' });

      const agreements = await LoanAgreement.list();
      const agreement = agreements.find(a => a.loan_id === loanId);

      if (agreement) {
        await LoanAgreement.update(agreement.id, {
          borrower_name: signature,
          borrower_signed_date: new Date().toISOString(),
          is_fully_signed: true
        });
      }

      setShowSignModal(false);
      setSelectedOffer(null);
      loadData();
    } catch (error) {
      console.error("Error signing loan offer:", error);
    }
  };

  const handleDeclineOffer = async (loanId) => {
    try {
      await Loan.update(loanId, { status: 'declined' });
      loadData();
    } catch (error) {
      console.error("Error declining loan offer:", error);
    }
  };

  const openSignModal = (offer) => {
    setSelectedOffer(offer);
    setShowSignModal(true);
  };

  // Filter loans by status
  const activeLoans = loans.filter(loan => loan.status === 'active');
  const manageableLoans = loans.filter(loan => loan.status === 'active' || loan.status === 'cancelled');
  const pendingOffers = loans.filter(loan => loan.status === 'pending');
  const completedLoans = loans.filter(loan => loan.status === 'completed' || loan.status === 'cancelled');

  const totalBorrowed = activeLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
  const totalOwed = activeLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);

  // Calculate total paid across all loans
  const calculateTotalPaid = () => {
    let totalPaid = 0;
    activeLoans.forEach(loan => {
      const paidAmount = loan.amount_paid || 0;
      totalPaid += paidAmount;
    });
    return totalPaid;
  };

  const totalPaid = calculateTotalPaid();
  const remainingBalance = totalOwed - totalPaid;

  // Find next payment due
  const nextPaymentLoan = activeLoans
    .filter(loan => loan.next_payment_date)
    .map(loan => ({ ...loan, date: new Date(loan.next_payment_date) }))
    .sort((a, b) => a.date - b.date)[0];

  const getNextPaymentDays = () => {
    if (!nextPaymentLoan) return null;
    const today = new Date();
    const paymentDate = new Date(nextPaymentLoan.date);
    const diffTime = paymentDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const nextPaymentDays = getNextPaymentDays();
  const nextPaymentAmount = nextPaymentLoan?.payment_amount || 0;
  const nextPaymentLenderUsername = nextPaymentLoan
    ? publicProfiles.find(p => p.user_id === nextPaymentLoan.lender_id)?.username || 'user'
    : null;

  // Overall repayment progress
  const overallProgress = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;

  // Get user by ID
  const getUserById = (userId) => {
    const profile = publicProfiles.find(p => p.user_id === userId);
    return profile || { username: 'user', full_name: 'Unknown User' };
  };

  // Get unique lenders from active loans
  const uniqueLenders = activeLoans.reduce((acc, loan) => {
    const lender = getUserById(loan.lender_id);
    if (!acc.find(l => l.userId === loan.lender_id)) {
      acc.push({ userId: loan.lender_id, username: lender?.username, fullName: lender?.full_name });
    }
    return acc;
  }, []);

  // Filter loans by selected person
  const filteredLoansForQuickPay = quickPayPerson
    ? activeLoans.filter(l => l.lender_id === quickPayPerson)
    : activeLoans;

  // Auto-select loan if only one matches the person filter
  useEffect(() => {
    if (quickPayPerson && filteredLoansForQuickPay.length === 1) {
      setQuickPayLoanId(filteredLoansForQuickPay[0].id);
    }
  }, [quickPayPerson, filteredLoansForQuickPay.length]);

  // Generate amortization schedule
  const generateAmortizationSchedule = (agreement) => {
    const schedule = [];
    const loanAmount = agreement.amount || 0;
    const frequency = agreement.payment_frequency || 'monthly';
    const annualRate = agreement.interest_rate || 0;

    if (loanAmount <= 0) return schedule;

    // Convert repayment period to total months
    const repaymentPeriod = agreement.repayment_period || 1;
    const repaymentUnit = agreement.repayment_unit || 'months';
    let totalMonths = repaymentPeriod;
    if (repaymentUnit === 'years') totalMonths = repaymentPeriod * 12;
    else if (repaymentUnit === 'weeks') totalMonths = repaymentPeriod / 4.333;

    // Total number of payments based on frequency
    let totalPayments;
    if (frequency === 'weekly') totalPayments = Math.round(totalMonths * 4.333);
    else if (frequency === 'biweekly') totalPayments = Math.round(totalMonths * 2.167);
    else if (frequency === 'daily') totalPayments = Math.round(totalMonths * 30.417);
    else totalPayments = Math.round(totalMonths);

    if (totalPayments <= 0) totalPayments = 1;

    // Periodic interest rate
    let periodsPerYear = 12;
    if (frequency === 'weekly') periodsPerYear = 52;
    else if (frequency === 'biweekly') periodsPerYear = 26;
    else if (frequency === 'daily') periodsPerYear = 365;

    const r = annualRate > 0 ? (annualRate / 100) / periodsPerYear : 0;

    // Payment using amortization formula: P = L * r / (1 - (1 + r)^(-n))
    // Keep raw (unrounded) for accurate schedule computation
    let rawPayment;
    if (r > 0) {
      rawPayment = loanAmount * r / (1 - Math.pow(1 + r, -totalPayments));
    } else {
      rawPayment = loanAmount / totalPayments;
    }

    let balance = loanAmount;
    let currentDate = new Date(agreement.created_at);
    let principalToDate = 0;
    let interestToDate = 0;

    for (let i = 1; i <= totalPayments; i++) {
      if (frequency === 'weekly') currentDate = addWeeks(currentDate, 1);
      else if (frequency === 'biweekly') currentDate = addWeeks(currentDate, 2);
      else if (frequency === 'daily') currentDate = addDays(currentDate, 1);
      else currentDate = addMonths(currentDate, 1);

      const startingBalance = balance;
      const interest = Math.round(balance * r * 100) / 100;
      let principal;

      if (i === totalPayments) {
        // Final payment: pay off remaining balance
        principal = balance;
        balance = 0;
      } else {
        // New balance = round(oldBalance * (1 + r) - payment, 2)
        const newBalance = Math.round((balance * (1 + r) - rawPayment) * 100) / 100;
        principal = Math.round((startingBalance - newBalance) * 100) / 100;
        balance = newBalance;
      }

      principalToDate = Math.round((principalToDate + principal) * 100) / 100;
      interestToDate = Math.round((interestToDate + interest) * 100) / 100;

      schedule.push({
        number: i,
        date: new Date(currentDate),
        startingBalance,
        principal,
        interest,
        principalToDate,
        interestToDate,
        endingBalance: balance
      });
    }

    return schedule;
  };

  // Promissory Note Popup Content
  const PromissoryNotePopup = ({ agreement }) => {
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);

    return (
      <div className="space-y-6">
        <div className="text-center border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">PROMISSORY NOTE</h2>
          <p className="text-sm text-slate-500 mt-1">Document ID: {agreement.id}</p>
        </div>

        <div className="bg-[#83F384] rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Principal Amount</p>
          <p className="text-3xl font-bold text-slate-800">{formatMoney(agreement.amount)}</p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="leading-relaxed">
            FOR VALUE RECEIVED, the undersigned Borrower, <span className="font-semibold">{borrowerInfo.full_name}</span> (@{borrowerInfo.username}),
            promises to pay to the order of <span className="font-semibold">{lenderInfo.full_name}</span> (@{lenderInfo.username}),
            the principal sum of <span className="font-semibold">{formatMoney(agreement.amount)}</span>,
            together with interest at the rate of <span className="font-semibold">{agreement.interest_rate}%</span> per annum.
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-slate-800 mb-3">Terms of Repayment</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Total Amount Due:</span> <span className="font-medium">{formatMoney(agreement.total_amount)}</span></div>
            <div><span className="text-slate-500">Interest Rate:</span> <span className="font-medium">{agreement.interest_rate}%</span></div>
            <div><span className="text-slate-500">Payment:</span> <span className="font-medium">{formatMoney(agreement.payment_amount)} {agreement.payment_frequency}</span></div>
            <div><span className="text-slate-500">Term:</span> <span className="font-medium">{agreement.repayment_period} {agreement.repayment_unit || 'months'}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 mb-1">Borrower</p>
            <p className="text-lg font-serif italic text-slate-800">{agreement.borrower_name || borrowerInfo.full_name}</p>
            {agreement.borrower_signed_date && (
              <p className="text-xs text-slate-500 mt-1">Signed {format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy')}</p>
            )}
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 mb-1">Lender</p>
            <p className="text-lg font-serif italic text-slate-800">{agreement.lender_name || lenderInfo.full_name}</p>
            {agreement.lender_signed_date && (
              <p className="text-xs text-slate-500 mt-1">Signed {format(new Date(agreement.lender_signed_date), 'MMM d, yyyy')}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Amortization Schedule Popup Content
  const AmortizationSchedulePopup = ({ agreement }) => {
    const schedule = generateAmortizationSchedule(agreement);
    const loan = manageLoanSelected;
    const paidPayments = loan?.amount_paid ? Math.floor(loan.amount_paid / agreement.payment_amount) : 0;

    return (
      <div className="space-y-6">
        <div className="text-center border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">AMORTIZATION SCHEDULE</h2>
          <p className="text-sm text-slate-500 mt-1">{schedule.length} payments · {agreement.payment_frequency}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#83F384] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-600">Principal</p>
            <p className="text-lg font-bold text-slate-800">{formatMoney(agreement.amount)}</p>
          </div>
          <div className="bg-[#83F384] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-600">Interest</p>
            <p className="text-lg font-bold text-slate-800">{formatMoney((agreement.total_amount || 0) - (agreement.amount || 0))}</p>
          </div>
          <div className="bg-[#83F384] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-600">Total</p>
            <p className="text-lg font-bold text-slate-800">{formatMoney(agreement.total_amount)}</p>
          </div>
        </div>

        <div className="max-h-[300px] overflow-x-auto overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-slate-600">Payment</th>
                <th className="px-2 py-2 text-left font-medium text-slate-600">Payment Date</th>
                <th className="px-2 py-2 text-right font-medium text-slate-600">Starting Balance</th>
                <th className="px-2 py-2 text-right font-medium text-slate-600">Principal Payment</th>
                <th className="px-2 py-2 text-right font-medium text-slate-600">Interest Payment</th>
                <th className="px-2 py-2 text-right font-medium text-slate-600">Principal to Date</th>
                <th className="px-2 py-2 text-right font-medium text-slate-600">Interest to Date</th>
                <th className="px-2 py-2 text-right font-medium text-slate-600">Ending Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedule.map((row, index) => (
                <tr
                  key={row.number}
                  className={index < paidPayments ? 'bg-green-50' : ''}
                >
                  <td className="px-2 py-2 text-slate-600">
                    {row.number}
                  </td>
                  <td className="px-2 py-2 text-slate-800">{format(row.date, 'MMM d, yyyy')}</td>
                  <td className="px-2 py-2 text-right text-slate-600">{formatMoney(row.startingBalance)}</td>
                  <td className="px-2 py-2 text-right font-medium text-slate-800">{formatMoney(row.principal)}</td>
                  <td className="px-2 py-2 text-right text-slate-600">{formatMoney(row.interest)}</td>
                  <td className="px-2 py-2 text-right text-slate-600">{formatMoney(row.principalToDate)}</td>
                  <td className="px-2 py-2 text-right text-slate-600">{formatMoney(row.interestToDate)}</td>
                  <td className="px-2 py-2 text-right font-medium text-slate-800">{formatMoney(row.endingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Loan Summary Popup Content
  const LoanSummaryPopup = ({ agreement }) => {
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);
    const loan = manageLoanSelected;

    const getStatusColor = (status) => {
      switch(status) {
        case 'active': return 'bg-green-100 text-green-800 border-green-200';
        case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Loan Summary</h2>
            <p className="text-sm text-slate-500 mt-1">{format(new Date(agreement.created_at), 'MMMM d, yyyy')}</p>
          </div>
          <Badge className={`${getStatusColor(loan?.status)} capitalize`}>{loan?.status || 'active'}</Badge>
        </div>

        <div className="bg-[#83F384] rounded-xl p-4 mb-1">
          <p className="text-xs text-slate-600 mb-1">Purpose</p>
          <p className="text-sm font-semibold text-slate-800">{loan?.purpose || agreement.purpose || 'Reason'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#83F384] rounded-xl p-4">
            <p className="text-xs text-slate-600 mb-1">Loan Amount</p>
            <p className="text-2xl font-bold text-slate-800">{formatMoney(agreement.amount)}</p>
          </div>
          <div className="bg-[#83F384] rounded-xl p-4">
            <p className="text-xs text-slate-600 mb-1">Total Due</p>
            <p className="text-2xl font-bold text-[#00A86B]">{formatMoney(agreement.total_amount)}</p>
          </div>
        </div>

        {loan && (
          <div className="bg-[#C2FFDC] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600">Payment Progress</span>
              <span className="text-sm font-medium text-slate-800">
                {formatMoney(loan.amount_paid || 0)} / {formatMoney(agreement.total_amount)}
              </span>
            </div>
            <div className="w-full bg-white rounded-full h-2">
              <div
                className="bg-[#00A86B] h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((loan.amount_paid || 0) / agreement.total_amount) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Interest Rate</p>
                <p className="font-semibold text-slate-800">{agreement.interest_rate}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Payment Amount</p>
                <p className="font-semibold text-slate-800">{formatMoney(agreement.payment_amount)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Payment Frequency</p>
                <p className="font-semibold text-slate-800 capitalize">{agreement.payment_frequency}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Due Date</p>
                <p className="font-semibold text-slate-800">{agreement.due_date ? format(new Date(agreement.due_date), 'MMM d, yyyy') : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-semibold text-slate-800 mb-3">Parties</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <img
                src={lenderInfo.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((lenderInfo.full_name || 'L').charAt(0))}&background=22c55e&color=fff&size=64`}
                alt={lenderInfo.full_name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-xs text-slate-500">Lender</p>
                <p className="font-medium text-slate-800">{lenderInfo.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={borrowerInfo.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((borrowerInfo.full_name || 'B').charAt(0))}&background=22c55e&color=fff&size=64`}
                alt={borrowerInfo.full_name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-xs text-slate-500">Borrower</p>
                <p className="font-medium text-slate-800">{borrowerInfo.full_name}</p>
              </div>
            </div>
          </div>
        </div>

        {agreement.purpose && (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Purpose</p>
            <p className="text-slate-800">{agreement.purpose}</p>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'overview', label: 'All' },
  ];

  return (
    <>
      {/* Document Popup Modal */}
      <AnimatePresence>
        {activeDocPopup && docPopupAgreement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={closeDocPopup}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#C2FFDC] flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#00A86B]" />
                  </div>
                  <span className="font-medium text-slate-800">
                    {activeDocPopup === 'promissory' && 'Promissory Note'}
                    {activeDocPopup === 'amortization' && 'Amortization Schedule'}
                    {activeDocPopup === 'summary' && 'Loan Summary'}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={closeDocPopup} className="text-slate-500 hover:text-slate-800">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6">
                {activeDocPopup === 'promissory' && <PromissoryNotePopup agreement={docPopupAgreement} />}
                {activeDocPopup === 'amortization' && <AmortizationSchedulePopup agreement={docPopupAgreement} />}
                {activeDocPopup === 'summary' && <LoanSummaryPopup agreement={docPopupAgreement} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen" style={{backgroundColor: '#C2FFDC'}}>
        {/* Full page background */}
        <div className="px-4 pt-8 pb-6 sm:px-8 md:px-24 md:pt-12 md:pb-6 lg:px-36">
          <div className="max-w-6xl mx-auto space-y-8 md:space-y-10">
            {/* Hero - Title + Overview Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 md:gap-10"
            >
              {/* Left Side - Title */}
              <div className="flex-shrink-0">
                <p className="text-4xl md:text-6xl font-bold text-[#1C4332] tracking-tight leading-tight font-serif">Borrowing</p>
              </div>

            </motion.div>

            {/* Next Payment Banner */}
            {nextPaymentLoan && nextPaymentDays !== null && (
              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#1C4332' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#83F384' }}>
                    <Clock className="w-4 h-4 text-[#1C4332]" />
                  </div>
                  <p className="text-sm text-[#C2FFDC] font-sans">
                    {nextPaymentDays > 0
                      ? <>Your next payment is due in <span className="font-bold text-white">{nextPaymentDays} {nextPaymentDays === 1 ? 'day' : 'days'}</span></>
                      : nextPaymentDays === 0
                        ? <span className="font-bold text-[#F59E0B]">Your next payment is due today</span>
                        : <span className="font-bold text-red-400">Your payment is {Math.abs(nextPaymentDays)} {Math.abs(nextPaymentDays) === 1 ? 'day' : 'days'} overdue</span>
                    }
                  </p>
                </div>
                <p className="text-sm font-bold text-white font-sans">
                  ${nextPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <Button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  variant={activeSection === tab.id ? 'default' : 'outline'}
                  className={`whitespace-nowrap ${
                    activeSection === tab.id
                      ? 'bg-[#1C4332] hover:bg-[#163a2a] text-[#C2FFDC] font-bold'
                      : 'bg-[#1C4332]/20 border-0 text-[#1C4332] hover:bg-[#1C4332]/30'
                  }`}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </Button>
              ))}
            </div>

            {/* Dark Green Content Box */}
            <div className="rounded-2xl p-4 sm:p-6 md:p-10" style={{backgroundColor: '#1C4332'}}>
              <div className="space-y-6 sm:space-y-8 md:space-y-10">

          {/* Content Sections */}
          <AnimatePresence mode="wait">
            {activeSection === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 md:space-y-10"
              >

                {/* Loan Progress + Next Payment */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Left: Loan Progress */}
                  <div className="rounded-2xl p-4 sm:p-5 border-0" style={{backgroundColor: '#83F384'}}>
                    <p className="text-lg font-bold text-slate-800 mb-4 tracking-tight font-serif">
                      Loan Progress
                    </p>
                    {activeLoans.length === 0 ? (
                      <p className="text-slate-500 text-sm">No active loans to track</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Summary Bar — all loans combined */}
                        {(() => {
                          const totalAll = activeLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
                          const paidAll = activeLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);
                          const pctAll = totalAll > 0 ? Math.round((paidAll / totalAll) * 100) : 0;
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-800">All Loans</span>
                                <span className="text-xs font-semibold text-slate-600">{pctAll}%</span>
                              </div>
                              <div className="w-full h-6 rounded-md overflow-hidden" style={{ backgroundColor: '#DBFFEB' }}>
                                <div
                                  className="h-full rounded-md transition-all duration-500"
                                  style={{ width: `${Math.max(pctAll, 2)}%`, backgroundColor: '#00A86B' }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-slate-500">
                                <span>${paidAll.toLocaleString()} paid</span>
                                <span>${totalAll.toLocaleString()} total</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Divider */}
                        <div className="border-t border-[#C2FFDC]" />

                        {/* Individual Loan Bars */}
                        {activeLoans.slice(0, 5).map(loan => {
                          const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                          const loanTotalOwed = loan.total_amount || loan.amount || 0;
                          const amountPaid = loan.amount_paid || 0;
                          const percentPaid = loanTotalOwed > 0 ? Math.round((amountPaid / loanTotalOwed) * 100) : 0;

                          return (
                            <div key={loan.id} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#C2FFDC] flex items-center justify-center">
                                    <span className="text-xs font-medium text-[#00A86B]">
                                      {lender?.full_name?.charAt(0) || '?'}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-slate-700">@{lender?.username || 'user'}</span>
                                  <span className="text-xs text-slate-400 truncate max-w-[100px]">· {loan.purpose || 'Reason'}</span>
                                </div>
                                <span className="text-xs text-slate-500">{percentPaid}%</span>
                              </div>
                              <div className="w-full h-5 rounded-md overflow-hidden" style={{ backgroundColor: '#DBFFEB' }}>
                                <div
                                  className="h-full rounded-md transition-all duration-500"
                                  style={{ width: `${Math.max(percentPaid, 2)}%`, backgroundColor: '#1C4332' }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-slate-500">
                                <span>${amountPaid.toLocaleString()} paid {loan.next_payment_date && <span>· Next Payment on {format(new Date(loan.next_payment_date), 'MMM d')}</span>}</span>
                                <span>${loanTotalOwed.toLocaleString()} total</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right: Next Payment + Overdue Notifications */}
                  <div className="flex flex-col gap-4">
                    {/* Next Payment Box */}
                    {nextPaymentLoan ? (
                      <div className="bg-[#C2FFDC] rounded-2xl p-5 border-0">
                        <p className="text-lg font-bold text-slate-800 mb-4 tracking-tight font-serif">
                          Next Payment
                        </p>
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#83F384' }}>
                          {/* Month icon */}
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#C2FFDC] flex flex-col items-center justify-center overflow-hidden">
                            <span className="text-[8px] font-bold text-[#1C4332] uppercase leading-none bg-[#1C4332] text-[#C2FFDC] w-full text-center py-0.5">{format(new Date(nextPaymentLoan.next_payment_date), 'MMM')}</span>
                            <span className="text-base font-bold text-[#1C4332] leading-tight">{format(new Date(nextPaymentLoan.next_payment_date), 'd')}</span>
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm">
                              ${nextPaymentAmount.toLocaleString()} due to @{nextPaymentLenderUsername}
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5 truncate">
                              for {nextPaymentLoan.purpose || 'loan'}
                            </p>
                          </div>
                          {/* Days badge */}
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#C2FFDC] flex flex-col items-center justify-center">
                            <span className="text-lg font-bold text-[#1C4332] leading-none">{nextPaymentDays !== null ? Math.abs(nextPaymentDays) : '?'}</span>
                            <span className="text-[8px] text-[#1C4332] font-medium">{nextPaymentDays !== null && Math.abs(nextPaymentDays) === 1 ? 'day' : 'days'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#C2FFDC] rounded-2xl p-5 border-0">
                        <p className="text-lg font-bold text-slate-800 mb-4 tracking-tight font-serif">
                          Next Payment
                        </p>
                        <p className="text-slate-500 text-sm">No upcoming payments</p>
                      </div>
                    )}

                    {/* Overdue Notifications */}
                    {(() => {
                      const overdueLoans = activeLoans.filter(l => {
                        if (!l.next_payment_date) return false;
                        return new Date(l.next_payment_date) < new Date();
                      });
                      if (overdueLoans.length === 0) return null;
                      return (
                        <div className="bg-[#C2FFDC] rounded-2xl p-5 border-0 border-l-4" style={{ borderLeftColor: '#EF4444' }}>
                          <p className="text-lg font-bold text-red-600 mb-3 tracking-tight font-serif">
                            Overdue
                          </p>
                          <div className="space-y-2">
                            {overdueLoans.map(loan => {
                              const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                              const daysOverdue = Math.ceil((new Date() - new Date(loan.next_payment_date)) / (1000 * 60 * 60 * 24));
                              return (
                                <div key={loan.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#FEF2F2' }}>
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                    <span className="text-base">🕐</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800">
                                      Your payment to <span className="font-semibold">@{lender?.username || 'user'}</span> is overdue
                                    </p>
                                    <p className="text-xs text-red-500 mt-0.5">
                                      {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue · if you made a payment make sure to record it
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Record Payment — right half */}
                {activeLoans.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>{/* spacer for left half */}</div>
                    <div className="rounded-2xl p-5 border-0 bg-[#C2FFDC]">
                      <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                        Record Payment
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>Record payment of</span>
                        <span className="font-medium">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="______"
                          value={quickPayAmount}
                          onChange={(e) => setQuickPayAmount(e.target.value)}
                          className="w-24 h-8 px-1 inline-flex border-0 bg-transparent text-[#1C4332] placeholder:text-[#1C4332] focus-visible:ring-0 focus-visible:ring-offset-0"
                          style={{ MozAppearance: 'textfield' }}
                        />
                        <span>to</span>
                        <Select
                          value={quickPayPerson}
                          onValueChange={(val) => {
                            setQuickPayPerson(val);
                            setQuickPayLoanId('');
                          }}
                        >
                          <SelectTrigger className="w-auto h-8 px-2 inline-flex border-0 bg-transparent focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="select person" />
                          </SelectTrigger>
                          <SelectContent>
                            {uniqueLenders.map((lender) => (
                              <SelectItem key={lender.userId} value={lender.userId}>
                                @{lender.username || 'user'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          onClick={() => {
                            const matchingLoans = quickPayPerson
                              ? activeLoans.filter(l => l.lender_id === quickPayPerson)
                              : activeLoans;
                            if (matchingLoans.length === 1) {
                              setSelectedLoan({
                                ...matchingLoans[0],
                                _prefillAmount: quickPayAmount,
                              });
                              setShowPaymentModal(true);
                            } else if (matchingLoans.length > 1) {
                              setSelectedLoan({
                                ...matchingLoans[0],
                                _prefillAmount: quickPayAmount,
                                _candidateLoans: matchingLoans,
                              });
                              setShowPaymentModal(true);
                            }
                          }}
                          disabled={!quickPayPerson || !quickPayAmount}
                          className={`h-8 px-4 rounded-lg text-sm font-medium border-0 transition-all ${
                            !quickPayPerson || !quickPayAmount
                              ? 'bg-[#00A86B]/50 text-white/70 cursor-not-allowed'
                              : 'bg-[#00A86B] text-white hover:bg-[#0D9B76]'
                          }`}
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                    {/* Manage Loans Section — inline at bottom of All tab */}
                    {!isLoading && manageableLoans.length > 0 && (
                      <div className="space-y-4 mt-6">
                        <p className="text-lg font-bold text-[#C2FFDC] tracking-tight font-serif">
                          Manage Loans
                        </p>
                        {/* Loan Selector Dropdown */}
                        <div className="bg-[#C2FFDC] rounded-2xl p-5 border-0">
                          <p className="text-base font-bold text-slate-800 mb-4 tracking-tight font-serif">
                            Your Loans
                          </p>
                            <Select
                              value={manageLoanSelected?.id || ''}
                              onValueChange={(value) => {
                                const loan = manageableLoans.find(l => l.id === value);
                                setManageLoanSelected(loan || null);
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a loan to manage...">
                                  {manageLoanSelected && (() => {
                                    const lender = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                                    return (
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-[#C2FFDC] flex items-center justify-center">
                                          <span className="text-xs font-medium text-[#00A86B]">
                                            {lender?.full_name?.charAt(0) || '?'}
                                          </span>
                                        </div>
                                        <span>@{lender?.username || 'user'}</span>
                                        <span className="text-slate-400">·</span>
                                        <span className="text-slate-500 truncate max-w-[120px]">{manageLoanSelected.purpose || 'Reason'}</span>
                                        <span className="text-slate-400">·</span>
                                        <span className="text-[#00A86B] font-medium">${manageLoanSelected.amount?.toLocaleString()}</span>
                                        {manageLoanSelected.status === 'cancelled' && (
                                          <span className="text-red-500 text-xs font-medium">(Cancelled)</span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {manageableLoans.map((loan) => {
                                  const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                                  return (
                                    <SelectItem key={loan.id} value={loan.id}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-[#C2FFDC] flex items-center justify-center">
                                          <span className="text-xs font-medium text-[#00A86B]">
                                            {lender?.full_name?.charAt(0) || '?'}
                                          </span>
                                        </div>
                                        <span>@{lender?.username || 'user'}</span>
                                        <span className="text-slate-400">·</span>
                                        <span className="text-slate-500 truncate max-w-[120px]">{loan.purpose || 'Reason'}</span>
                                        <span className="text-slate-400">·</span>
                                        <span className="text-[#00A86B] font-medium">${loan.amount?.toLocaleString()}</span>
                                        {loan.status === 'cancelled' && (
                                          <span className="text-red-500 text-xs font-medium">(Cancelled)</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                        </div>

                        {/* Loan Details - Below Dropdown */}
                        {manageLoanSelected && (
                          <>
                            {/* Loan Information Box */}
                            <div className="bg-[#C2FFDC] rounded-2xl p-5">
                              <p className="text-base font-bold text-slate-800 mb-4 tracking-tight font-serif">
                                Loan Information
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-[#83F384] rounded-xl p-4">
                                  <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Amount</p>
                                  <p className="text-xl font-bold text-slate-800">
                                    ${(manageLoanSelected.amount || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-[#83F384] rounded-xl p-4">
                                  <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Interest</p>
                                  <p className="text-xl font-bold text-slate-800">
                                    {manageLoanSelected.interest_rate || 0}%
                                  </p>
                                </div>
                                <div className="bg-[#83F384] rounded-xl p-4">
                                  <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Term</p>
                                  <p className="text-xl font-bold text-slate-800">
                                    {manageLoanSelected.repayment_period || 0} {manageLoanSelected.repayment_unit || 'months'}
                                  </p>
                                </div>
                                <div className="bg-[#83F384] rounded-xl p-4">
                                  <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Payment</p>
                                  <p className="text-xl font-bold text-slate-800">
                                    ${(manageLoanSelected.payment_amount || 0).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Actions Box - only show for active loans */}
                            {manageLoanSelected.status !== 'cancelled' && (
                            <div className="bg-[#C2FFDC] rounded-2xl p-5">
                              <p className="text-base font-bold text-slate-800 mb-4 tracking-tight font-serif">
                                Actions
                              </p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                  onClick={() => handleMakePayment(manageLoanSelected)}
                                  className="bg-[#83F384] rounded-xl p-3 md:p-4 text-left hover:opacity-90 transition-all duration-200 cursor-pointer group flex items-center gap-3 flex-1"
                                >
                                  <div className="w-9 h-9 rounded-full bg-[#C2FFDC] flex items-center justify-center flex-shrink-0">
                                    <DollarSign className="w-4 h-4 text-[#0A1A10]" />
                                  </div>
                                  <p className="font-semibold text-[#0A1A10] text-[14px] group-hover:text-[#00A86B] transition-colors">
                                    Record Payment
                                  </p>
                                </button>
                                <button
                                  onClick={() => handleEditLoan(manageLoanSelected)}
                                  className="bg-[#83F384] rounded-xl p-3 md:p-4 text-left hover:opacity-90 transition-all duration-200 cursor-pointer group flex items-center gap-3 flex-1"
                                >
                                  <div className="w-9 h-9 rounded-full bg-[#C2FFDC] flex items-center justify-center flex-shrink-0">
                                    <Pencil className="w-4 h-4 text-[#0A1A10]" />
                                  </div>
                                  <p className="font-semibold text-[#0A1A10] text-[14px] group-hover:text-[#00A86B] transition-colors">
                                    Request Loan Edit
                                  </p>
                                </button>
                                <button
                                  onClick={() => handleCancelLoan(manageLoanSelected)}
                                  className="bg-[#83F384] rounded-xl p-3 md:p-4 text-left hover:opacity-90 transition-all duration-200 cursor-pointer group flex items-center gap-3 flex-1"
                                >
                                  <div className="w-9 h-9 rounded-full bg-[#C2FFDC] flex items-center justify-center flex-shrink-0">
                                    <X className="w-4 h-4 text-[#0A1A10]" />
                                  </div>
                                  <p className="font-semibold text-[#0A1A10] text-[14px] group-hover:text-[#00A86B] transition-colors">
                                    Request Loan Cancellation
                                  </p>
                                </button>
                              </div>
                            </div>
                            )}

                            {/* Cancelled notice */}
                            {manageLoanSelected.status === 'cancelled' && (
                              <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
                                <p className="text-sm text-red-600 font-medium">This loan has been cancelled. Documentation is still available above.</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

              </motion.div>
            )}
          </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPaymentModal && selectedLoan && (
        <RecordPaymentModal
          loan={selectedLoan}
          candidateLoans={selectedLoan._candidateLoans || []}
          onClose={() => setShowPaymentModal(false)}
          onPaymentComplete={handlePaymentComplete}
          isLender={false}
        />
      )}

      {showDetailsModal && selectedLoanDetails && (
        <LoanDetailsModal
          loan={selectedLoanDetails.loan}
          type="borrowed"
          isOpen={showDetailsModal}
          user={user}
          onCancel={() => handleCancelLoan(selectedLoanDetails.loan)}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLoanDetails(null);
          }}
        />
      )}

      {showSignModal && selectedOffer && (
        <BorrowerSignatureModal
          isOpen={showSignModal}
          onClose={() => {
            setShowSignModal(false);
            setSelectedOffer(null);
          }}
          onSign={(signature) => handleSignOffer(selectedOffer.id, signature)}
          loanDetails={selectedOffer}
          userFullName={user?.full_name || ''}
          lenderName={publicProfiles.find(p => p.user_id === selectedOffer.lender_id)?.full_name || 'Lender'}
        />
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="rounded-2xl border-0 p-0 overflow-hidden" style={{ backgroundColor: '#DBEEE3' }}>
          <div className="p-6 pb-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>Cancel Loan</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-600 mt-1">
                Are you sure you want to cancel this loan? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl border-0 font-semibold text-[#0A1A10] text-[14px] h-12 hover:opacity-90 transition-all" style={{ backgroundColor: '#83F384' }}>
              Keep Loan
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelLoan} className="flex-1 rounded-xl border-0 font-semibold text-[#0A1A10] text-[14px] h-12 hover:opacity-90 transition-all" style={{ backgroundColor: '#83F384' }}>
              Request Loan Cancellation
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Confirm Payment Popup */}
      <AnimatePresence>
        {showQuickConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => !isQuickProcessing && !isQuickSuccess && setShowQuickConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#DBEEE3] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              {isQuickSuccess ? (
                <div className="p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-[#00A86B] flex items-center justify-center mx-auto mb-4"
                  >
                    <Check className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Payment Recorded!</h3>
                  <p className="text-sm text-slate-500 mb-4">Waiting for the Lender to confirm</p>
                  <div className="bg-[#C2FFDC] rounded-2xl p-4 space-y-2">
                    <p className="text-2xl font-bold text-slate-800">${parseFloat(quickPayAmount).toFixed(2)}</p>
                    <p className="text-xs text-slate-500">via {PAYMENT_METHOD_LABELS[quickPayMethod]}</p>
                    {quickPayTransactionId && (
                      <p className="text-[10px] font-mono text-slate-400 mt-2">Ref: {quickPayTransactionId}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">The loan balance will update once both parties confirm.</p>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#C2FFDC] flex items-center justify-center">
                        <Shield className="w-4 h-4 text-[#00A86B]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">Confirm Payment</h3>
                        <p className="text-xs text-slate-500">Review and confirm the details</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowQuickConfirm(false)}
                      className="w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-[#C2FFDC] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Amount</span>
                      <span className="text-2xl font-bold text-slate-800">${quickPayAmount ? parseFloat(quickPayAmount).toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">To</span>
                      <span className="font-medium text-slate-800">
                        {quickPayLoanId
                          ? getUserById(activeLoans.find(l => l.id === quickPayLoanId)?.lender_id)?.full_name || 'Lender'
                          : '_'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Method</span>
                      <span className="font-medium text-slate-800">{PAYMENT_METHOD_LABELS[quickPayMethod] || '_____'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">For</span>
                      <span className="font-medium text-slate-800">
                        {quickPayLoanId
                          ? (activeLoans.find(l => l.id === quickPayLoanId)?.purpose || `Loan $${activeLoans.find(l => l.id === quickPayLoanId)?.amount}`)
                          : '_'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Date</span>
                      <span className="font-medium text-slate-800">{format(new Date(), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  {/* Notice */}
                  <div className="bg-[#C2FFDC] rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600">
                      The Lender will need to confirm this payment. Make sure the details are correct.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-1">
                    <Button
                      onClick={() => setShowQuickConfirm(false)}
                      className="flex-1 bg-white hover:bg-white/80 text-slate-700 border-0 rounded-xl"
                      disabled={isQuickProcessing}
                    >
                      Cancel
                    </Button>
                    <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleQuickPayConfirm}
                        disabled={isQuickProcessing}
                        className="w-full bg-[#00A86B] hover:bg-[#0D9B76] text-white rounded-xl"
                      >
                        {isQuickProcessing ? (
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
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

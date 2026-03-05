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
  const [manageLoanInitialized, setManageLoanInitialized] = useState(false);
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
  const [allPayments, setAllPayments] = useState([]);

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
      const [allLoans, allProfiles, allAgreements, allPmts] = await Promise.all([
        Loan.list('-created_at').catch(() => []),
        PublicProfile.list().catch(() => []),
        LoanAgreement.list().catch(() => []),
        Payment.list('-payment_date').catch(() => [])
      ]);

      const userLoans = (allLoans || []).filter(loan =>
        loan.borrower_id === currentUser.id
      );

      setLoans(userLoans);
      setPublicProfiles(allProfiles || []);
      setLoanAgreements(allAgreements || []);
      setAllPayments(allPmts || []);
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

  // Auto-select first loan when loans load
  useEffect(() => {
    if (!manageLoanInitialized && manageableLoans.length > 0) {
      setManageLoanSelected(manageableLoans[0]);
      setManageLoanInitialized(true);
    }
  }, [manageableLoans, manageLoanInitialized]);

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

      <div className="min-h-screen" style={{backgroundColor: '#0F2B1F'}}>
        {/* Full page background */}
        <div className="px-4 pt-20 pb-20 sm:px-8 md:px-24 md:pt-28 md:pb-28 lg:px-36">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-8 md:gap-10 w-full"
            >
            {/* Hero - Title */}
            <div className="flex-shrink-0">
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#C2FFDC] tracking-tight leading-tight font-serif">Borrowing</p>
            </div>

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
                      : 'bg-[#1C4332]/40 border-0 text-[#C2FFDC]/60 hover:bg-[#1C4332]/60 hover:text-[#C2FFDC]'
                  }`}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </Button>
              ))}
            </div>

            {/* Content Sections */}
            <div>

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

                {/* Loan Progress + Upcoming Payments | Next Payment + Overdue */}
                <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                  {/* Left: Loan Progress + Upcoming Payments */}
                  <div className="flex flex-col gap-6 md:gap-8">
                  <div className="rounded-xl px-4 py-3 shadow-sm bg-[#1C4332]">
                    <p className="text-sm font-bold text-[#C2FFDC] mb-2 tracking-tight font-serif">
                      Loan Progress
                    </p>
                    {activeLoans.length === 0 ? (
                      <p className="text-[#00A86B] text-sm">No active loans to track</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Summary Bar — all loans combined */}
                        {(() => {
                          const totalAll = activeLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
                          const paidAll = activeLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);
                          const pctAll = totalAll > 0 ? Math.round((paidAll / totalAll) * 100) : 0;
                          return (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="text-[11px] font-medium text-[#00A86B]">Paid Back</p>
                                <p className="text-[11px] font-bold text-[#C2FFDC]">
                                  {formatMoney(paidAll)} / {formatMoney(totalAll)}
                                </p>
                              </div>
                              <div className="w-full h-5 bg-[#0F2B1F] rounded-md overflow-hidden">
                                <div
                                  className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                                  style={{
                                    width: `${Math.max(pctAll, 2)}%`,
                                    backgroundColor: '#00A86B'
                                  }}
                                >
                                  {paidAll > 0 && (
                                    <span className="text-[10px] font-bold text-white">
                                      {pctAll}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Divider */}
                        <div className="border-t border-[#00A86B]/20" />

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
                                  <span className="text-[11px] font-medium text-[#C2FFDC]">@{lender?.username || 'user'}</span>
                                  <span className="text-[10px] text-[#00A86B] truncate max-w-[100px]">· {loan.purpose || 'Reason'}</span>
                                </div>
                                <span className="text-[11px] font-bold text-[#C2FFDC]">{percentPaid}%</span>
                              </div>
                              <div className="w-full h-5 bg-[#0F2B1F] rounded-md overflow-hidden">
                                <div
                                  className="h-full rounded-md transition-all duration-500"
                                  style={{ width: `${Math.max(percentPaid, 2)}%`, backgroundColor: '#1C4332' }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-[#00A86B]">
                                <span>${amountPaid.toLocaleString()} paid {loan.next_payment_date && <span>· Next on {format(new Date(loan.next_payment_date), 'MMM d')}</span>}</span>
                                <span>${loanTotalOwed.toLocaleString()} total</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Payments */}
                  {(() => {
                    const upcomingLoans = activeLoans
                      .filter(l => l.next_payment_date && new Date(l.next_payment_date) >= new Date())
                      .map(l => {
                        const lender = publicProfiles.find(p => p.user_id === l.lender_id);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const payDate = new Date(l.next_payment_date);
                        payDate.setHours(0, 0, 0, 0);
                        const days = Math.ceil((payDate - today) / (1000 * 60 * 60 * 24));
                        return { ...l, lenderUsername: lender?.username || 'user', days, payDate };
                      })
                      .sort((a, b) => a.payDate - b.payDate)
                      .slice(0, 5);

                    return (
                      <div className="rounded-xl px-4 py-3 shadow-sm bg-[#1C4332]">
                        <p className="text-sm font-bold text-[#C2FFDC] mb-2.5 tracking-tight font-serif">
                          Upcoming Payments
                        </p>
                        {upcomingLoans.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-[#00A86B]">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 mb-1.5">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <p className="text-xs">No upcoming payments</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {upcomingLoans.map(loan => (
                              <div key={loan.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#0F2B1F]">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#6AD478] flex items-center justify-center shadow-sm">
                                  <p className="text-[10px] font-bold text-[#C2FFDC] text-center leading-tight">
                                    {loan.days}
                                    <span className="block text-[7px] font-medium text-[#00A86B]">
                                      {loan.days === 1 ? 'day' : 'days'}
                                    </span>
                                  </p>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-[#C2FFDC]">
                                    Send <span className="font-semibold">${(loan.payment_amount || 0).toLocaleString()}</span> to <span className="font-semibold">@{loan.lenderUsername}</span>
                                  </p>
                                  <p className="text-[10px] text-[#00A86B] mt-0.5">{format(loan.payDate, 'MMM d, yyyy')}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  </div>

                  {/* Right: Next Payment + Overdue + Record Payment + Loans Ranked By */}
                  <div className="flex flex-col gap-6 md:gap-8">
                    {/* Next Payment Box */}
                    <div className="rounded-xl px-4 py-3 shadow-sm bg-[#1C4332]">
                      <p className="text-sm font-bold text-[#C2FFDC] mb-2 tracking-tight font-serif">
                        Next Payment
                      </p>
                      {nextPaymentLoan ? (
                        <div className="border-t border-[#00A86B]/20 pt-2 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] text-[#00A86B] mb-0.5">Next Payment Date</p>
                            <div className="flex items-baseline gap-1.5">
                              <p className="text-base font-bold text-[#C2FFDC]">
                                {format(new Date(nextPaymentLoan.next_payment_date), 'EEE, MMM d')}
                              </p>
                              {nextPaymentDays !== null && (
                                <p className="text-[11px] text-[#00A86B]">
                                  {nextPaymentDays > 0 ? `${nextPaymentDays}d away` : nextPaymentDays === 0 ? 'Due today' : `${Math.abs(nextPaymentDays)}d overdue`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] text-[#00A86B] mb-0.5">Next Payment Amount</p>
                            <div className="flex items-baseline gap-1.5">
                              <p className="text-base font-bold text-[#C2FFDC]">
                                {formatMoney(nextPaymentAmount)}
                              </p>
                              <p className="text-[11px] text-[#00A86B]">
                                to @{nextPaymentLenderUsername}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-[#00A86B]">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 mb-1.5">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          <p className="text-xs">No upcoming payments</p>
                        </div>
                      )}
                    </div>

                    {/* Overdue Payments */}
                    {(() => {
                      const overdueLoans = activeLoans.filter(l => {
                        if (!l.next_payment_date) return false;
                        return new Date(l.next_payment_date) < new Date();
                      });
                      if (overdueLoans.length === 0) return null;
                      return (
                        <div className="rounded-xl px-4 py-3 shadow-sm bg-[#1C4332] border border-red-200">
                          <p className="text-sm font-bold text-red-500 mb-2.5 tracking-tight font-sans">
                            Overdue Payments
                          </p>
                          <div className="space-y-1.5">
                            {overdueLoans.map(loan => {
                              const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                              const daysOverdue = Math.ceil((new Date() - new Date(loan.next_payment_date)) / (1000 * 60 * 60 * 24));
                              return (
                                <div key={loan.id} className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ backgroundColor: '#FEF2F2' }}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-[#C2FFDC]">
                                      Send payment to <span className="font-semibold">@{lender?.username || 'user'}</span>
                                    </p>
                                    <p className="text-[10px] text-red-500 mt-0.5">
                                      {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue · record it if already paid
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedLoan({ ...loan });
                                      setShowPaymentModal(true);
                                    }}
                                    className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg mt-0.5 cursor-pointer"
                                    style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                                  >
                                    Record Payment
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Record Payment */}
                    {activeLoans.length > 0 && (
                      <div className="rounded-xl px-4 py-3 shadow-sm" style={{ backgroundColor: '#00A86B' }}>
                        <p className="text-sm font-bold text-white mb-2 tracking-tight font-sans">
                          Record Payment
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-white">
                          <span>Record payment of</span>
                          <span className="font-medium">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder=""
                            value={quickPayAmount}
                            onChange={(e) => setQuickPayAmount(e.target.value)}
                            className="w-20 h-7 px-2 bg-white/20 border-0 text-xs inline-flex rounded-md text-white placeholder:text-white/50"
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
                            <SelectTrigger className="w-auto h-7 px-2 bg-white/20 border-0 text-xs inline-flex rounded-md text-white">
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
                            className={`h-7 px-3 rounded-md text-xs font-semibold border-0 transition-all ${
                              !quickPayPerson || !quickPayAmount
                                ? 'bg-white/30 text-white/70 cursor-not-allowed'
                                : 'bg-white text-[#00A86B] hover:bg-white/90'
                            }`}
                          >
                            Submit
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Loans Ranked By */}
                    {activeLoans.length > 0 && (
                      <div className="rounded-xl px-4 py-3 shadow-sm bg-[#1C4332]">
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-sm font-bold text-[#C2FFDC] tracking-tight font-serif">
                            Loans Ranked By
                          </p>
                          <Select value={rankingFilter} onValueChange={setRankingFilter}>
                            <SelectTrigger className="w-auto h-7 px-2 border-0 bg-[#C2FFDC] text-xs font-medium rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="highest_interest">Highest Interest</SelectItem>
                              <SelectItem value="highest_payment">Highest Payment</SelectItem>
                              <SelectItem value="soonest_deadline">Soonest Deadline</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          {(() => {
                            const sorted = [...activeLoans].sort((a, b) => {
                              if (rankingFilter === 'highest_interest') return (b.interest_rate || 0) - (a.interest_rate || 0);
                              if (rankingFilter === 'highest_payment') return (b.payment_amount || 0) - (a.payment_amount || 0);
                              if (rankingFilter === 'soonest_deadline') {
                                const dateA = a.next_payment_date ? new Date(a.next_payment_date) : new Date('2099-01-01');
                                const dateB = b.next_payment_date ? new Date(b.next_payment_date) : new Date('2099-01-01');
                                return dateA - dateB;
                              }
                              return 0;
                            });
                            return sorted.slice(0, 5).map((loan, idx) => {
                              const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                              const rankValue = rankingFilter === 'highest_interest'
                                ? `${loan.interest_rate || 0}%`
                                : rankingFilter === 'highest_payment'
                                  ? `$${(loan.payment_amount || 0).toLocaleString()}`
                                  : loan.next_payment_date ? format(new Date(loan.next_payment_date), 'MMM d') : 'N/A';

                              return (
                                <div key={loan.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#0F2B1F]">
                                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#6AD478]/20 flex items-center justify-center shadow-sm">
                                    <span className="text-xs font-bold text-[#1C4332]">{idx + 1}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-medium text-[#C2FFDC] truncate">
                                      @{lender?.username || 'user'} · {loan.purpose || 'Loan'}
                                    </p>
                                  </div>
                                  <span className="text-[11px] font-bold text-[#C2FFDC] flex-shrink-0">{rankValue}</span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                    {/* Your Loans Section — thin list + chart + details */}
                    {!isLoading && manageableLoans.length > 0 && (() => {

                      // Build payment chart data for selected loan
                      let chartData = [];
                      let plannedPaymentAmount = 0;
                      if (manageLoanSelected) {
                        const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id);
                        plannedPaymentAmount = manageLoanSelected.payment_amount || 0;

                        // Get schedule from agreement or generate one
                        const totalPayments = manageLoanSelected.repayment_period || 1;
                        const loanPayments = allPayments.filter(p => p.loan_id === manageLoanSelected.id && (p.status === 'confirmed' || p.status === 'pending_confirmation'));

                        // Sort payments by date
                        const sortedPayments = [...loanPayments].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));

                        // Generate chart: each payment period gets a bar
                        for (let i = 0; i < totalPayments; i++) {
                          const payment = sortedPayments[i];
                          chartData.push({
                            label: `P${i + 1}`,
                            amount: payment ? payment.amount : 0,
                            isPaid: !!payment
                          });
                        }

                        // If there are more actual payments than periods, add them
                        if (sortedPayments.length > totalPayments) {
                          for (let i = totalPayments; i < sortedPayments.length; i++) {
                            chartData.push({
                              label: `P${i + 1}`,
                              amount: sortedPayments[i].amount,
                              isPaid: true
                            });
                          }
                        }
                      }

                      const chartHeight = 140;
                      const maxChartVal = Math.max(plannedPaymentAmount, ...chartData.map(d => d.amount), 1);

                      return (
                        <div className="mt-4">
                          <p className="text-sm font-bold text-[#C2FFDC] tracking-tight font-sans mb-3">
                            Your Loans
                          </p>

                          {/* Select a Loan — bright green bar with centered title + dropdown */}
                          <div className="rounded-xl px-4 py-3 shadow-sm mb-4" style={{ backgroundColor: '#6AD478' }}>
                            <p className="text-sm font-bold text-[#1C4332] text-center tracking-tight font-serif mb-2">
                              Select a Loan to Learn More
                            </p>
                            <div className="relative">
                              <select
                                value={manageLoanSelected?.id || ''}
                                onChange={(e) => {
                                  const selected = manageableLoans.find(l => l.id === e.target.value);
                                  if (selected) setManageLoanSelected(selected);
                                }}
                                className="w-full appearance-none rounded-lg px-3 py-2 text-[12px] font-semibold text-[#C2FFDC] font-sans bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C4332]/20"
                              >
                                {manageableLoans.map((loan) => {
                                  const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                                  return (
                                    <option key={loan.id} value={loan.id}>
                                      @{lender?.username || 'user'} — ${loan.amount?.toLocaleString()}{loan.status === 'cancelled' ? ' · Cancelled' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Two-column grid: Left = Payment History, Right = Loan Information */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            {/* Left: Payment Bar Chart */}
                            <div className="flex flex-col gap-6 md:gap-8">
                              {/* Summary bar — only over chart + info columns */}
                              {manageLoanSelected && (() => {
                                const selLender = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                                return (
                                  <div className="rounded-xl px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#00A86B' }}>
                                    <img
                                      src={selLender?.profile_picture_url || selLender?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((selLender?.full_name || 'U').charAt(0))}&background=1C4332&color=fff&size=64`}
                                      alt={selLender?.full_name || 'Lender'}
                                      className="w-7 h-7 rounded-full object-cover flex-shrink-0 bg-white"
                                    />
                                    <p className="text-[13px] font-semibold text-white font-sans">
                                      @{selLender?.username || 'user'} lent you ${(manageLoanSelected.amount || 0).toLocaleString()} to help with {manageLoanSelected.purpose || 'personal expenses'}
                                    </p>
                                  </div>
                                );
                              })()}

                              {/* Payment Progress Box — Donut Chart left, Next Payment right */}
                              {manageLoanSelected && (() => {
                                const loanAmount = manageLoanSelected.amount || 0;
                                const totalAmt = manageLoanSelected.total_amount || loanAmount;
                                const paidAmt = manageLoanSelected.amount_paid || 0;
                                const paidPct = totalAmt > 0 ? (paidAmt / totalAmt) * 100 : 0;

                                const selLender = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                                const lenderUsername = selLender?.username || 'user';
                                const nextPmtAmt = manageLoanSelected.payment_amount || 0;

                                let nextPmtDate = null;
                                let daysUntil = null;
                                if (manageLoanSelected.next_payment_date) {
                                  nextPmtDate = new Date(manageLoanSelected.next_payment_date);
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const pmtDay = new Date(nextPmtDate);
                                  pmtDay.setHours(0, 0, 0, 0);
                                  daysUntil = Math.ceil((pmtDay - today) / (1000 * 60 * 60 * 24));
                                }

                                /* Donut chart — bigger & thinner */
                                const size = 140;
                                const cx = size / 2;
                                const cy = size / 2;
                                const outerR = 60;
                                const innerR = 48;
                                const paidAngle = (paidPct / 100) * 360;
                                const toRad = (deg) => (deg - 90) * (Math.PI / 180);
                                const paidEndXo = cx + outerR * Math.cos(toRad(paidAngle));
                                const paidEndYo = cy + outerR * Math.sin(toRad(paidAngle));
                                const paidEndXi = cx + innerR * Math.cos(toRad(paidAngle));
                                const paidEndYi = cy + innerR * Math.sin(toRad(paidAngle));
                                const largeArc = paidAngle > 180 ? 1 : 0;

                                return (
                                  <div className="bg-[#1C4332] rounded-xl px-4 py-3 shadow-sm">
                                    <p className="text-sm font-bold text-[#C2FFDC] mb-2.5 tracking-tight font-serif">
                                      Payment Progress
                                    </p>
                                    <div className="flex items-center gap-4">
                                      {/* Left — Donut Chart + $paid/$borrowed */}
                                      <div className="flex-shrink-0 flex flex-col items-center">
                                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                                          {/* Background ring (remaining) */}
                                          <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="#C2FFDC" strokeWidth={outerR - innerR} />
                                          {/* Paid arc ring */}
                                          {paidPct > 0 && paidPct < 100 && (
                                            <path
                                              d={`M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 ${largeArc} 1 ${paidEndXo} ${paidEndYo} L ${paidEndXi} ${paidEndYi} A ${innerR} ${innerR} 0 ${largeArc} 0 ${cx} ${cy - innerR} Z`}
                                              fill="#00A86B"
                                            />
                                          )}
                                          {paidPct >= 100 && (
                                            <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="#00A86B" strokeWidth={outerR - innerR} />
                                          )}
                                          {/* Center percentage */}
                                          <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" className="text-[15px] font-bold fill-[#1C4332]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                            {Math.round(paidPct)}%
                                          </text>
                                        </svg>
                                        <p className="text-[12px] font-semibold text-[#C2FFDC] font-sans mt-1.5">
                                          ${paidAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          <span className="text-[#00A86B]/60 font-normal"> / ${loanAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </p>
                                      </div>
                                      {/* Right — Next Payment info */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-[#00A86B] font-medium font-sans mb-1">Next Payment</p>
                                        {nextPmtDate ? (
                                          <>
                                            <p className="text-[13px] font-bold text-[#C2FFDC] font-sans">{format(nextPmtDate, 'MMM d, yyyy')}</p>
                                            <p className="text-[10px] text-[#00A86B] font-sans mb-3">
                                              {daysUntil > 0
                                                ? `Due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`
                                                : daysUntil === 0
                                                  ? 'Due today'
                                                  : `${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'day' : 'days'} overdue`
                                              }
                                            </p>
                                          </>
                                        ) : (
                                          <p className="text-[12px] text-[#C2FFDC]/40 font-sans mb-3">No upcoming payment</p>
                                        )}
                                        <p className="text-[10px] text-[#00A86B] font-medium font-sans mb-1">Amount</p>
                                        <p className="text-[13px] font-bold text-[#C2FFDC] font-sans">
                                          ${nextPmtAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-[10px] text-[#00A86B] font-sans">to @{lenderUsername}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Quick Action Circles — under Payment Progress */}
                              {manageLoanSelected && manageLoanSelected.status !== 'cancelled' && (
                                <div className="flex items-start justify-center gap-5 py-1">
                                  <button onClick={() => handleMakePayment(manageLoanSelected)} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                                    <div className="w-12 h-12 rounded-full bg-[#0F2B1F] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                      </svg>
                                    </div>
                                    <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">Record<br/>Payment</p>
                                  </button>
                                  <button onClick={() => handleEditLoan(manageLoanSelected)} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                                    <div className="w-12 h-12 rounded-full bg-[#0F2B1F] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                      </svg>
                                    </div>
                                    <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">Request<br/>Loan Edit</p>
                                  </button>
                                  <button onClick={() => handleCancelLoan(manageLoanSelected)} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                                    <div className="w-12 h-12 rounded-full bg-[#0F2B1F] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="15" y1="9" x2="9" y2="15"></line>
                                        <line x1="9" y1="9" x2="15" y2="15"></line>
                                      </svg>
                                    </div>
                                    <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">Request<br/>Cancellation</p>
                                  </button>
                                </div>
                              )}

                              <div className="bg-[#1C4332] rounded-xl px-4 py-3 shadow-sm">
                                <p className="text-sm font-bold text-[#C2FFDC] mb-2.5 tracking-tight font-serif">
                                  Payment History
                                </p>
                                {!manageLoanSelected ? (
                                  <div className="flex items-center justify-center" style={{ height: chartHeight }}>
                                    <p className="text-xs text-[#00A86B]/60 font-sans">Select a loan to view chart</p>
                                  </div>
                                ) : chartData.length === 0 ? (
                                  <div className="flex items-center justify-center" style={{ height: chartHeight }}>
                                    <p className="text-xs text-[#00A86B]/60 font-sans">No payment schedule</p>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    {/* Chart area */}
                                    <div className="flex items-end gap-0.5" style={{ height: chartHeight }}>
                                      {/* Y-axis labels */}
                                      <div className="flex flex-col justify-between pr-1.5 flex-shrink-0 h-full">
                                        <p className="text-[9px] text-[#00A86B]/60 font-mono">${maxChartVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                        <p className="text-[9px] text-[#00A86B]/60 font-mono">${Math.round(maxChartVal / 2).toLocaleString()}</p>
                                        <p className="text-[9px] text-[#00A86B]/60 font-mono">$0</p>
                                      </div>
                                      {/* Bars */}
                                      <div className="flex-1 flex items-end justify-between relative h-full">
                                        {/* Dashed line at planned payment amount */}
                                        {plannedPaymentAmount > 0 && (
                                          <div
                                            className="absolute left-0 right-0 border-t-2 border-dashed border-[#C2FFDC]/40 z-10"
                                            style={{ bottom: `${(plannedPaymentAmount / maxChartVal) * 100}%` }}
                                          >
                                            <span className="absolute -top-3.5 right-0 text-[8px] font-semibold text-[#C2FFDC]/60 font-mono bg-[#1C4332] px-1">
                                              ${plannedPaymentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                          </div>
                                        )}
                                        {chartData.map((d, i) => {
                                          const barHeight = maxChartVal > 0 ? (d.amount / maxChartVal) * chartHeight : 0;
                                          const isOver = d.amount >= plannedPaymentAmount && plannedPaymentAmount > 0;
                                          return (
                                            <div key={i} className="flex flex-col items-center flex-1" style={{ maxWidth: 40 }}>
                                              <div className="w-full flex justify-center">
                                                <div
                                                  className={`rounded-t-sm transition-all ${
                                                    d.amount === 0
                                                      ? 'bg-[#C2FFDC]/50'
                                                      : isOver
                                                        ? 'bg-[#00A86B]'
                                                        : 'bg-[#00A86B]/60'
                                                  }`}
                                                  style={{
                                                    height: Math.max(barHeight, d.amount > 0 ? 4 : 2),
                                                    width: '70%',
                                                    minWidth: 8
                                                  }}
                                                  title={`${d.label}: $${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                                                />
                                              </div>
                                              <p className="text-[8px] text-[#00A86B] font-sans mt-1 leading-none">{d.label}</p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    {/* Legend */}
                                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#00A86B]/20">
                                      <div className="flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-[#00A86B]" />
                                        <span className="text-[9px] text-[#00A86B] font-sans">Paid</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-4 h-0 border-t-2 border-dashed border-[#C2FFDC]/40" />
                                        <span className="text-[9px] text-[#00A86B] font-sans">Plan Amount</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right: Loan Information + Actions */}
                            <div className="flex flex-col gap-6 md:gap-8">
                              {!manageLoanSelected ? (
                                <div className="bg-[#1C4332] rounded-xl px-4 py-3 shadow-sm flex items-center justify-center min-h-[200px]">
                                  <div className="text-center">
                                    <ClipboardList className="w-10 h-10 mx-auto mb-2 text-[#00A86B]/30" />
                                    <p className="text-sm text-[#00A86B]/60 font-sans">Select a loan to view details</p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Your Loan Box — top 4 items in a row */}
                                  <div className="bg-[#1C4332] rounded-xl px-4 py-3 shadow-sm relative">
                                    <p className="text-sm font-bold text-[#C2FFDC] mb-2.5 tracking-tight font-serif">
                                      Loan Terms
                                    </p>
                                    {(() => {
                                      const amount = manageLoanSelected.amount || 0;
                                      const interestRate = manageLoanSelected.interest_rate || 0;
                                      const repaymentPeriod = manageLoanSelected.repayment_period || 0;
                                      const repaymentUnit = manageLoanSelected.repayment_unit || 'months';
                                      const paymentFrequency = manageLoanSelected.payment_frequency || 'monthly';

                                      const items = [
                                        { label: 'Loan Amount', value: `$${amount.toLocaleString()}` },
                                        { label: 'Interest Rate', value: `${interestRate}%` },
                                        { label: 'Term', value: `${repaymentPeriod} ${repaymentUnit}` },
                                        { label: 'Frequency', value: paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1) },
                                      ];

                                      return (
                                        <div className="grid grid-cols-4 gap-2">
                                          {items.map((item, idx) => (
                                            <div key={idx} className="text-center">
                                              <p className="text-[10px] text-[#00A86B] font-medium font-sans mb-0.5">{item.label}</p>
                                              <p className="text-[13px] font-bold text-[#C2FFDC] font-sans">{item.value}</p>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Document Icons — under Loan Terms */}
                                  <div className="flex items-start justify-center gap-5 py-1">
                                    {/* Promissory Note */}
                                    <button onClick={() => {
                                      const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id);
                                      if (agreement) openDocPopup('promissory', agreement);
                                    }} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                                      <div className="w-12 h-12 rounded-full bg-[#0F2B1F] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow relative">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                          <polyline points="14 2 14 8 20 8"></polyline>
                                          <line x1="16" y1="13" x2="8" y2="13"></line>
                                          <line x1="16" y1="17" x2="8" y2="17"></line>
                                          <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                        <div className="absolute -top-0.5 -right-0.5 group/pn" onClick={(e) => e.stopPropagation()}>
                                          <div className="w-4 h-4 rounded-full bg-[#00A86B] flex items-center justify-center cursor-help">
                                            <span className="text-[9px] font-bold text-white leading-none">i</span>
                                          </div>
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-[#1C4332] rounded-lg shadow-lg opacity-0 group-hover/pn:opacity-100 pointer-events-none group-hover/pn:pointer-events-auto transition-opacity whitespace-nowrap z-50">
                                            <p className="text-[10px] font-bold text-[#6AD478] mb-0.5">Promissory Note</p>
                                            <p className="text-[9px] text-[#C2FFDC]/80 leading-snug">A legal document where the borrower<br/>promises to repay the lender.</p>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1C4332] rotate-45 -mt-1"></div>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">Promissory<br/>Note</p>
                                    </button>
                                    {/* Amortization Schedule */}
                                    <button onClick={() => {
                                      const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id);
                                      if (agreement) openDocPopup('amortization', agreement);
                                    }} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                                      <div className="w-12 h-12 rounded-full bg-[#0F2B1F] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow relative">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                          <line x1="16" y1="2" x2="16" y2="6"></line>
                                          <line x1="8" y1="2" x2="8" y2="6"></line>
                                          <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                        <div className="absolute -top-0.5 -right-0.5 group/as" onClick={(e) => e.stopPropagation()}>
                                          <div className="w-4 h-4 rounded-full bg-[#00A86B] flex items-center justify-center cursor-help">
                                            <span className="text-[9px] font-bold text-white leading-none">i</span>
                                          </div>
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-[#1C4332] rounded-lg shadow-lg opacity-0 group-hover/as:opacity-100 pointer-events-none group-hover/as:pointer-events-auto transition-opacity whitespace-nowrap z-50">
                                            <p className="text-[10px] font-bold text-[#6AD478] mb-0.5">Amortization Schedule</p>
                                            <p className="text-[9px] text-[#C2FFDC]/80 leading-snug">A table showing each payment broken<br/>down into principal and interest.</p>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1C4332] rotate-45 -mt-1"></div>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">Amortization<br/>Schedule</p>
                                    </button>
                                    {/* Loan Summary */}
                                    <button onClick={() => {
                                      const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id);
                                      if (agreement) openDocPopup('summary', agreement);
                                    }} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                                      <div className="w-12 h-12 rounded-full bg-[#0F2B1F] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                      </div>
                                      <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">Loan<br/>Summary</p>
                                    </button>
                                  </div>

                                  {/* Loan Progress Box — horizontal row style */}
                                  <div className="bg-[#1C4332] rounded-xl px-4 py-3 shadow-sm relative">
                                    <p className="text-sm font-bold text-[#C2FFDC] mb-2.5 tracking-tight font-serif">
                                      Loan Progress
                                    </p>
                                    {(() => {
                                      const amount = manageLoanSelected.amount || 0;
                                      const totalAmount = manageLoanSelected.total_amount || amount;
                                      const amountPaid = manageLoanSelected.amount_paid || 0;
                                      const paymentAmount = manageLoanSelected.payment_amount || 0;
                                      const repaymentPeriod = manageLoanSelected.repayment_period || 0;
                                      const paymentFrequency = manageLoanSelected.payment_frequency || 'monthly';
                                      const lender = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                                      const lenderUsername = lender?.username || 'user';

                                      /* Calculate payments made */
                                      const loanPmts = allPayments.filter(p => p.loan_id === manageLoanSelected.id && (p.status === 'confirmed' || p.status === 'pending_confirmation'));
                                      const paymentsMade = loanPmts.length;

                                      /* Frequency label */
                                      const freqLabel = paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1);

                                      const items = [
                                        { label: 'Total Owed', value: `$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'with interest' },
                                        { label: 'Amount Paid', value: `$${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: null },
                                        { label: 'Payments Made', value: `${paymentsMade}/${repaymentPeriod}`, sub: 'payments' },
                                        { label: `${freqLabel} Payments`, value: `$${paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: `to @${lenderUsername}` },
                                      ];

                                      return (
                                        <div className="grid grid-cols-4 gap-2">
                                          {items.map((item, idx) => (
                                            <div key={idx} className="text-center">
                                              <p className="text-[10px] text-[#00A86B] font-medium font-sans mb-0.5">{item.label}</p>
                                              <p className="text-[13px] font-bold text-[#C2FFDC] font-sans">{item.value}</p>
                                              {item.sub && (
                                                <p className="text-[9px] text-[#00A86B]/70 font-sans mt-0.5">{item.sub}</p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Payments Box */}
                                  <div className="bg-[#1C4332] rounded-xl px-4 py-3 shadow-sm">
                                    <p className="text-sm font-bold text-[#C2FFDC] mb-2.5 tracking-tight font-serif">
                                      Payments
                                    </p>
                                    {(() => {
                                      const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id);
                                      const loanPmts = allPayments.filter(p => p.loan_id === manageLoanSelected.id);
                                      const confirmedPmts = loanPmts.filter(p => p.status === 'confirmed');
                                      const pendingPmts = loanPmts.filter(p => p.status === 'pending_confirmation');

                                      /* Build schedule from agreement or from loan fields */
                                      let schedule = [];
                                      if (agreement) {
                                        schedule = generateAmortizationSchedule(agreement);
                                      } else {
                                        /* Fallback: generate dates from loan data */
                                        const freq = manageLoanSelected.payment_frequency || 'monthly';
                                        const numP = manageLoanSelected.repayment_period || 1;
                                        let dt = new Date(manageLoanSelected.created_at);
                                        for (let i = 1; i <= numP; i++) {
                                          if (freq === 'weekly') dt = addWeeks(new Date(dt), 1);
                                          else if (freq === 'biweekly') dt = addWeeks(new Date(dt), 2);
                                          else if (freq === 'daily') dt = addDays(new Date(dt), 1);
                                          else dt = addMonths(new Date(dt), 1);
                                          schedule.push({ number: i, date: new Date(dt) });
                                        }
                                      }

                                      /* Sort actual payments by date to match against schedule */
                                      const sortedConfirmed = [...confirmedPmts].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
                                      const sortedPending = [...pendingPmts].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));

                                      /* Determine status for each scheduled payment */
                                      const paymentAmt = manageLoanSelected.payment_amount || 0;
                                      let firstUnpaidFound = false;

                                      const paymentRows = schedule.map((s, idx) => {
                                        const matchedConfirmed = sortedConfirmed[idx] || null;
                                        const matchedPending = sortedPending.find(p => !matchedConfirmed && idx < sortedConfirmed.length + sortedPending.length);

                                        let status;
                                        if (idx < sortedConfirmed.length) {
                                          status = 'completed';
                                        } else if (idx < sortedConfirmed.length + sortedPending.length) {
                                          status = 'pending';
                                        } else if (!firstUnpaidFound) {
                                          status = 'record';
                                          firstUnpaidFound = true;
                                        } else {
                                          status = 'upcoming';
                                        }

                                        const displayAmount = status === 'completed'
                                          ? sortedConfirmed[idx]?.amount || paymentAmt
                                          : status === 'pending'
                                            ? sortedPending[idx - sortedConfirmed.length]?.amount || paymentAmt
                                            : paymentAmt;

                                        return { number: s.number, date: s.date, amount: displayAmount, status };
                                      });

                                      const statusConfig = {
                                        completed: { label: 'Completed', bg: 'bg-[#00A86B]/20', text: 'text-[#6AD478]', ringColor: 'border-[#00A86B]' },
                                        pending: { label: 'Pending', bg: 'bg-[#F59E0B]/20', text: 'text-[#F59E0B]', ringColor: 'border-[#F59E0B]' },
                                        record: { label: 'Record Payment', bg: 'bg-[#00A86B]', text: 'text-white', ringColor: 'border-[#00A86B]' },
                                        upcoming: { label: 'Upcoming', bg: 'bg-[#C2FFDC]/10', text: 'text-[#00A86B]', ringColor: 'border-[#00A86B]/30' },
                                      };

                                      return (
                                        <div className="space-y-1.5 max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                          {paymentRows.map((row) => {
                                            const cfg = statusConfig[row.status];
                                            return (
                                              <div key={row.number} className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0F2B1F]">
                                                {/* Payment number circle */}
                                                <div className={`w-8 h-8 rounded-full border-2 ${cfg.ringColor} flex items-center justify-center flex-shrink-0 bg-[#0F2B1F]`}>
                                                  <span className="text-[11px] font-bold text-[#C2FFDC]">{row.number}</span>
                                                </div>
                                                {/* Amount + Due date */}
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-[12px] font-semibold text-[#C2FFDC] font-sans">
                                                    ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </p>
                                                  <p className="text-[10px] text-[#00A86B]/70 font-sans">
                                                    {format(row.date, 'MMM d, yyyy')}
                                                  </p>
                                                </div>
                                                {/* Status button */}
                                                {row.status === 'record' ? (
                                                  <button
                                                    onClick={() => handleMakePayment(manageLoanSelected)}
                                                    className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${cfg.bg} ${cfg.text} cursor-pointer hover:opacity-90 transition-opacity`}
                                                  >
                                                    {cfg.label}
                                                  </button>
                                                ) : (
                                                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                                                    {cfg.label}
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Activity Box */}
                                  <div className="bg-[#1C4332] rounded-xl px-4 py-3 shadow-sm">
                                    <p className="text-sm font-bold text-[#C2FFDC] mb-2.5 tracking-tight font-serif">
                                      Activity
                                    </p>
                                    {(() => {
                                      const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id);
                                      const loanPmts = allPayments.filter(p => p.loan_id === manageLoanSelected.id);
                                      const lenderProfile = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                                      const borrowerProfile = publicProfiles.find(p => p.user_id === user?.id);
                                      const lenderName = lenderProfile?.username || 'lender';
                                      const borrowerName = borrowerProfile?.username || 'you';

                                      const activities = [];

                                      // Loan created
                                      if (manageLoanSelected.created_at) {
                                        activities.push({
                                          timestamp: new Date(manageLoanSelected.created_at),
                                          type: 'created',
                                          description: `Loan created between @${borrowerName} and @${lenderName}`,
                                        });
                                      }

                                      // Borrower signature
                                      if (agreement?.borrower_signed_date) {
                                        activities.push({
                                          timestamp: new Date(agreement.borrower_signed_date),
                                          type: 'signature',
                                          description: `@${borrowerName} signed the loan agreement`,
                                        });
                                      }

                                      // Lender signature
                                      if (agreement?.lender_signed_date) {
                                        activities.push({
                                          timestamp: new Date(agreement.lender_signed_date),
                                          type: 'signature',
                                          description: `@${lenderName} signed the loan agreement`,
                                        });
                                      }

                                      // Payments
                                      loanPmts.forEach(payment => {
                                        const pmtStatus = payment.status === 'confirmed' ? 'confirmed' : 'recorded';
                                        activities.push({
                                          timestamp: new Date(payment.payment_date || payment.created_at),
                                          type: 'payment',
                                          description: `Payment of $${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${pmtStatus}`,
                                        });
                                      });

                                      // Cancellation
                                      if (agreement?.cancelled_date) {
                                        activities.push({
                                          timestamp: new Date(agreement.cancelled_date),
                                          type: 'cancellation',
                                          description: 'Loan was cancelled',
                                        });
                                      }

                                      // Completion
                                      if (manageLoanSelected.status === 'completed') {
                                        activities.push({
                                          timestamp: new Date(),
                                          type: 'completion',
                                          description: 'Loan repaid in full',
                                        });
                                      }

                                      // Sort newest first
                                      activities.sort((a, b) => b.timestamp - a.timestamp);

                                      const getIcon = (type) => {
                                        switch (type) {
                                          case 'created':
                                            return (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#00A86B" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                              </svg>
                                            );
                                          case 'signature':
                                            return (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#1C4332" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                              </svg>
                                            );
                                          case 'payment':
                                            return (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#00A86B" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                              </svg>
                                            );
                                          case 'cancellation':
                                            return (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#EF4444" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            );
                                          case 'completion':
                                            return (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#00A86B" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            );
                                          default:
                                            return null;
                                        }
                                      };

                                      const getDotColor = (type) => {
                                        switch (type) {
                                          case 'created': return 'bg-[#C2FFDC] border-[#00A86B]';
                                          case 'signature': return 'bg-[#F0FFF4] border-[#1C4332]';
                                          case 'payment': return 'bg-[#C2FFDC] border-[#00A86B]';
                                          case 'cancellation': return 'bg-red-50 border-red-400';
                                          case 'completion': return 'bg-[#C2FFDC] border-[#00A86B]';
                                          default: return 'bg-gray-100 border-gray-300';
                                        }
                                      };

                                      if (activities.length === 0) {
                                        return (
                                          <p className="text-[11px] text-[#00A86B]/60 font-sans">No activity recorded yet.</p>
                                        );
                                      }

                                      return (
                                        <div className="space-y-0 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                          {activities.map((activity, idx) => (
                                            <div key={idx} className="flex items-start gap-2.5 relative">
                                              {/* Timeline line */}
                                              {idx < activities.length - 1 && (
                                                <div className="absolute left-[11px] top-[22px] w-[1px] bg-[#C2FFDC]" style={{ height: 'calc(100% - 6px)' }} />
                                              )}
                                              {/* Icon dot */}
                                              <div className={`w-[23px] h-[23px] rounded-full border-[1.5px] ${getDotColor(activity.type)} flex items-center justify-center flex-shrink-0 z-10 mt-1`}>
                                                {getIcon(activity.type)}
                                              </div>
                                              {/* Content */}
                                              <div className="flex-1 min-w-0 pb-3">
                                                <p className="text-[11px] text-[#C2FFDC] font-sans leading-snug">
                                                  {activity.description}
                                                </p>
                                                <p className="text-[9px] text-[#00A86B]/60 font-sans mt-0.5">
                                                  {format(activity.timestamp, 'MMM d, yyyy · h:mm a')}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Cancelled notice */}
                                  {manageLoanSelected.status === 'cancelled' && (
                                    <div className="bg-red-50 rounded-xl px-4 py-3 shadow-sm border border-red-200">
                                      <p className="text-sm text-red-600 font-medium">This loan has been cancelled.</p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

              </motion.div>
            )}
          </AnimatePresence>
            </div>

            </motion.div>
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

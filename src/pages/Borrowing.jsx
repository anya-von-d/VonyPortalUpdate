import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, User, LoanAgreement, PublicProfile, Friendship, VenmoConnection, PayPalConnection } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Pencil, X, FolderOpen, ClipboardList, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, addMonths, addWeeks } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";

import LoanCard from "@/components/loans/LoanCard";

import LoanDetailsModal from "@/components/loans/LoanDetailsModal";
import MyLoanOffers from "@/components/dashboard/MyLoanOffers";
import BorrowerSignatureModal from "@/components/loans/BorrowerSignatureModal";
import DashboardSidebar from "@/components/DashboardSidebar";

const STAR_CIRCLES = [
  {cx:82,cy:45,o:0.7},{cx:195,cy:112,o:0.5},{cx:310,cy:28,o:0.8},{cx:420,cy:198,o:0.4},
  {cx:530,cy:67,o:0.65},{cx:640,cy:245,o:0.55},{cx:755,cy:88,o:0.75},{cx:860,cy:156,o:0.45},
  {cx:970,cy:34,o:0.7},{cx:1085,cy:201,o:0.6},{cx:1190,cy:78,o:0.5},{cx:1300,cy:267,o:0.7},
  {cx:1410,cy:45,o:0.55},{cx:1520,cy:134,o:0.65},{cx:48,cy:189,o:0.4},{cx:158,cy:278,o:0.6},
  {cx:268,cy:156,o:0.5},{cx:378,cy:89,o:0.7},{cx:488,cy:234,o:0.45},{cx:598,cy:145,o:0.6},
  {cx:708,cy:312,o:0.35},{cx:818,cy:56,o:0.75},{cx:928,cy:223,o:0.5},{cx:1038,cy:98,o:0.65},
  {cx:1148,cy:289,o:0.4},{cx:1258,cy:167,o:0.7},{cx:1368,cy:234,o:0.55},{cx:1478,cy:78,o:0.6},
  {cx:1560,cy:256,o:0.45},{cx:125,cy:312,o:0.5},{cx:345,cy:267,o:0.6},{cx:565,cy:34,o:0.75},
];

export default function Borrowing() {
  const [loans, setLoans] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loanToCancel, setLoanToCancel] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [activeTab, setActiveTab] = useState('summary');
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [manageLoanSelected, setManageLoanSelected] = useState(null);
  const [manageLoanInitialized, setManageLoanInitialized] = useState(false);
  const [rankingFilter, setRankingFilter] = useState('highest_interest');
  const [loanAgreements, setLoanAgreements] = useState([]);
  const [activeDocPopup, setActiveDocPopup] = useState(null);
  const [docPopupAgreement, setDocPopupAgreement] = useState(null);
  const [activeInfoTooltip, setActiveInfoTooltip] = useState(null);
  const [allUserLoans, setAllUserLoans] = useState([]);
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
      // Store all user loans (both lending and borrowing) for record payment dropdowns
      const allMyLoans = (allLoans || []).filter(loan =>
        loan.borrower_id === currentUser.id || loan.lender_id === currentUser.id
      );
      setAllUserLoans(allMyLoans);
      setPublicProfiles(allProfiles || []);
      setLoanAgreements(allAgreements || []);
      setAllPayments(allPmts || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleMakePayment = () => {
    window.location.href = createPageUrl("RecordPayment");
  };

  const handleViewDetails = (loan) => {
    setSelectedLoanDetails({ loan, type: 'borrowed' });
    setShowDetailsModal(true);
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
    return daysUntilDate(nextPaymentLoan.next_payment_date);
  };

  const nextPaymentDays = getNextPaymentDays();
  // Calculate next payment amount including overdue rollover
  const nextPaymentAmount = (() => {
    if (!nextPaymentLoan) return 0;
    const agreement = loanAgreements.find(a => a.loan_id === nextPaymentLoan.id);
    const analysis = analyzeLoanPayments(nextPaymentLoan, allPayments, agreement);
    if (analysis && analysis.nextPaymentAmount > 0) return analysis.nextPaymentAmount;
    return nextPaymentLoan.payment_amount || 0;
  })();
  const nextPaymentLenderUsername = nextPaymentLoan
    ? publicProfiles.find(p => p.user_id === nextPaymentLoan.lender_id)?.full_name || 'User'
    : null;

  // Overall repayment progress
  const overallProgress = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;

  // Get user by ID
  const getUserById = (userId) => {
    const profile = publicProfiles.find(p => p.user_id === userId);
    return profile || { username: 'user', full_name: 'Unknown User' };
  };

  // Generate amortization schedule (function declaration for hoisting)
  function generateAmortizationSchedule(agreement) {
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
  }

  /**
   * Analyze loan payments period-by-period with:
   * - Dynamic interest accrual (Total Owed = unpaid principal + accrued interest to date)
   * - Full payment counting (only periods where cumulative payments >= scheduled amount count)
   * - Overpayment: reduces future monthly amounts (remaining balance / remaining periods)
   * - Underpayment rollover: deficit rolls into next period only, then back to normal
   */
  function analyzeLoanPayments(loan, payments, agreement) {
    if (!loan) return null;

    const principal = loan.amount || 0;
    const annualRate = loan.interest_rate || 0;
    const totalPeriods = loan.repayment_period || 1;
    const frequency = loan.payment_frequency || 'monthly';
    const originalPaymentAmount = loan.payment_amount || 0;

    // Periodic interest rate
    let periodsPerYear = 12;
    if (frequency === 'weekly') periodsPerYear = 52;
    else if (frequency === 'biweekly') periodsPerYear = 26;
    else if (frequency === 'daily') periodsPerYear = 365;
    const r = annualRate > 0 ? (annualRate / 100) / periodsPerYear : 0;

    // Only confirmed payments impact the loan balance
    const confirmedPayments = payments
      .filter(p => p.loan_id === loan.id && p.status === 'confirmed')
      .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));

    // All payments (confirmed + pending) for chart display
    const allLoanPayments = payments
      .filter(p => p.loan_id === loan.id && (p.status === 'confirmed' || p.status === 'pending_confirmation'))
      .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));

    // Generate schedule dates
    let scheduleDates = [];
    if (agreement) {
      const sched = generateAmortizationSchedule(agreement);
      scheduleDates = sched.map(s => s.date);
    } else {
      let dt = new Date(loan.created_at);
      for (let i = 0; i < totalPeriods; i++) {
        if (frequency === 'weekly') dt = addWeeks(new Date(dt), 1);
        else if (frequency === 'biweekly') dt = addWeeks(new Date(dt), 2);
        else if (frequency === 'daily') dt = addDays(new Date(dt), 1);
        else dt = addMonths(new Date(dt), 1);
        scheduleDates.push(new Date(dt));
      }
    }

    // Assign confirmed payments to periods (these impact the loan balance)
    // Period i covers from scheduleDates[i-1] (or loan start) to scheduleDates[i]
    const loanStart = new Date(loan.created_at);
    const periodConfirmedPayments = [];
    const periodAllPayments = []; // For chart display (confirmed + pending)
    // Use the smaller of totalPeriods and scheduleDates.length to avoid undefined dates
    const effectivePeriods = Math.min(totalPeriods, scheduleDates.length);
    for (let i = 0; i < effectivePeriods; i++) {
      const periodStart = i === 0 ? loanStart : scheduleDates[i - 1];
      const periodEnd = scheduleDates[i];
      const confirmedInPeriod = confirmedPayments.filter(p => {
        const pDate = new Date(p.payment_date);
        return pDate > periodStart && pDate <= periodEnd;
      });
      const allInPeriod = allLoanPayments.filter(p => {
        const pDate = new Date(p.payment_date);
        return pDate > periodStart && pDate <= periodEnd;
      });
      periodConfirmedPayments.push(confirmedInPeriod);
      periodAllPayments.push(allInPeriod);
    }

    // Also capture any payments after the last scheduled date
    if (scheduleDates.length > 0) {
      const lastDate = scheduleDates[scheduleDates.length - 1];
      const lateConfirmed = confirmedPayments.filter(p => new Date(p.payment_date) > lastDate);
      const lateAll = allLoanPayments.filter(p => new Date(p.payment_date) > lastDate);
      if (lateConfirmed.length > 0 && effectivePeriods > 0) {
        periodConfirmedPayments[effectivePeriods - 1] = [...periodConfirmedPayments[effectivePeriods - 1], ...lateConfirmed];
      }
      if (lateAll.length > 0 && effectivePeriods > 0) {
        periodAllPayments[effectivePeriods - 1] = [...periodAllPayments[effectivePeriods - 1], ...lateAll];
      }
    }

    // Walk through periods calculating balance, interest, payments made, rollover
    let remainingPrincipal = principal;
    let totalInterestAccrued = 0;
    let totalPaid = 0;
    let fullPaymentCount = 0;
    let deficit = 0; // rollover from previous period
    const periodResults = [];

    for (let i = 0; i < effectivePeriods; i++) {
      // Interest accrued this period on remaining principal
      const periodInterest = Math.round(remainingPrincipal * r * 100) / 100;
      totalInterestAccrued += periodInterest;

      // Scheduled amount for this period (original + any deficit from last period)
      const scheduledAmount = originalPaymentAmount + deficit;

      // Only confirmed payments impact the balance
      const confirmedPaidSum = periodConfirmedPayments[i].reduce((sum, p) => sum + (p.amount || 0), 0);
      totalPaid += confirmedPaidSum;

      // All payments in this period (for chart display)
      const allPaidSum = periodAllPayments[i].reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingPaidSum = allPaidSum - confirmedPaidSum;

      // Is this a full payment? Only confirmed payments count
      const isFullPayment = confirmedPaidSum >= scheduledAmount && scheduledAmount > 0;
      if (isFullPayment) fullPaymentCount++;

      // Calculate new deficit or overpayment (based on confirmed only)
      let periodDeficit = 0;
      let periodOverpayment = 0;
      if (confirmedPaidSum < scheduledAmount) {
        periodDeficit = Math.round((scheduledAmount - confirmedPaidSum) * 100) / 100;
      } else if (confirmedPaidSum > scheduledAmount) {
        periodOverpayment = Math.round((confirmedPaidSum - scheduledAmount) * 100) / 100;
      }

      // Apply confirmed payment to principal: payment goes to interest first, then principal
      let paymentToInterest = Math.min(confirmedPaidSum, periodInterest);
      let paymentToPrincipal = Math.max(0, confirmedPaidSum - paymentToInterest);
      remainingPrincipal = Math.max(0, Math.round((remainingPrincipal - paymentToPrincipal) * 100) / 100);

      const isPast = toLocalDate(scheduleDates[i]) <= getLocalToday();

      periodResults.push({
        period: i + 1,
        date: scheduleDates[i],
        scheduledAmount: Math.round(scheduledAmount * 100) / 100,
        confirmedPaid: Math.round(confirmedPaidSum * 100) / 100,
        pendingPaid: Math.round(pendingPaidSum * 100) / 100,
        actualPaid: Math.round(allPaidSum * 100) / 100,
        isFullPayment,
        isPast,
        hasConfirmedPayments: periodConfirmedPayments[i].length > 0,
        hasPendingPayments: periodAllPayments[i].length > periodConfirmedPayments[i].length,
        hasAnyPayments: periodAllPayments[i].length > 0,
        deficit: periodDeficit,
        overpayment: periodOverpayment,
        interestThisPeriod: periodInterest,
        remainingPrincipal,
        confirmedPayments: periodConfirmedPayments[i],
        allPayments: periodAllPayments[i]
      });

      // Set deficit for next period: only carries for one period, then resets
      deficit = periodDeficit;
    }

    // Calculate remaining balance and recalculated payment
    const totalOwed = Math.round((remainingPrincipal + (remainingPrincipal > 0 ? remainingPrincipal * r * (totalPeriods - fullPaymentCount) : 0)) * 100) / 100;

    // Simpler total owed: remaining principal + interest that will accrue on it
    const remainingPeriodsCount = Math.max(1, totalPeriods - periodResults.filter(p => p.isPast && p.hasConfirmedPayments).length);
    const futureInterest = Math.round(remainingPrincipal * r * remainingPeriodsCount * 100) / 100;
    const dynamicTotalOwed = Math.round((remainingPrincipal + futureInterest) * 100) / 100;

    // Current total owed = unpaid principal + interest accrued so far
    const currentTotalOwed = Math.round((remainingPrincipal + totalInterestAccrued - (totalPaid - (principal - remainingPrincipal))) * 100) / 100;

    // Simplest: total owed right now = principal + all interest accrued to date - all payments made
    const totalOwedNow = Math.max(0, Math.round((principal + totalInterestAccrued - totalPaid) * 100) / 100);

    // Recalculated monthly payment based on remaining balance
    const unpaidPeriods = totalPeriods - fullPaymentCount;
    const recalcPayment = unpaidPeriods > 0 && totalOwedNow > 0
      ? Math.round((totalOwedNow / unpaidPeriods) * 100) / 100
      : 0;

    // Next period's payment amount (includes any current deficit rollover)
    const currentPeriodIdx = periodResults.findIndex(p => !p.isPast || (p.isPast && !p.hasConfirmedPayments));
    const nextPeriodDeficit = currentPeriodIdx > 0 ? periodResults[currentPeriodIdx - 1]?.deficit || 0 : 0;
    const nextPaymentAmount = recalcPayment > 0 ? Math.round((recalcPayment + nextPeriodDeficit) * 100) / 100 : originalPaymentAmount;

    return {
      principal,
      totalOwedNow, // unpaid principal + accrued interest - payments
      totalPaid,
      totalInterestAccrued,
      remainingPrincipal,
      fullPaymentCount,
      totalPeriods,
      recalcPayment, // recalculated regular payment (remaining / unpaid periods)
      nextPaymentAmount, // next payment including any rollover
      originalPaymentAmount,
      periodResults,
      deficit: periodResults.length > 0 ? periodResults[periodResults.length - 1].deficit : 0,
      paidPercentage: (principal + totalInterestAccrued) > 0
        ? Math.min(100, (totalPaid / (principal + totalInterestAccrued)) * 100)
        : 0
    };
  }

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
            <span className="font-semibold">{lenderInfo.full_name}</span> agrees to lend <span className="font-semibold">{borrowerInfo.full_name}</span> <span className="font-semibold">{formatMoney(agreement.amount)}</span>{agreement.purpose ? <> for <span className="font-semibold">{agreement.purpose}</span></> : ''}, with <span className="font-semibold">{agreement.interest_rate}%</span> interest. <span className="font-semibold">{borrowerInfo.full_name}</span> agrees to pay back <span className="font-semibold">{formatMoney(agreement.total_amount)}</span> in <span className="font-semibold">{agreement.payment_frequency}</span> payments of <span className="font-semibold">{formatMoney(agreement.payment_amount)}</span> over <span className="font-semibold">{agreement.repayment_period} {agreement.repayment_unit || 'months'}</span>.
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
                src={lenderInfo.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((lenderInfo.full_name || 'L').charAt(0))}&background=678AFB&color=fff&size=64`}
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
                src={borrowerInfo.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((borrowerInfo.full_name || 'B').charAt(0))}&background=678AFB&color=fff&size=64`}
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

  const tabs = [];

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #678AFB', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 14, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading borrowing...</p>
        </div>
      </div>
    );
  }

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
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(103,138,251,0.1)' }}>
                    <FileText className="w-4 h-4" style={{ color: '#678AFB' }} />
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

      <div className="home-with-sidebar" style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240, background: '#F5F4F0' }}>
        <DashboardSidebar activePage="Borrowing" user={user} />

        <div style={{ position: 'relative', margin: '20px 12px 12px 0', borderRadius: 24, overflow: 'hidden', minHeight: 'calc(100vh - 32px)', border: '6px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'rgba(0,0,0,0.03) 0px 0.6px 2.3px -0.42px, rgba(0,0,0,0.04) 0px 2.3px 8.7px -0.83px, rgba(0,0,0,0.08) 0px 10px 38px -1.25px, inset 0 0 0 1px rgba(255,255,255,0.5), inset 0 0 30px rgba(255,255,255,0.6), inset 0 0 50px rgba(255,255,255,0.3)' }}>
          {/* Galaxy gradient background */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', top: 0, left: '-10%', width: '120%', height: '100%', zIndex: 0,
              background: '#7792F4'
            }} />
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px' }}>
            {/* Hero */}
            <div style={{ paddingTop: 80, paddingBottom: 20, textAlign: 'center' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '3.2rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#1A1918', margin: 0 }}>Lending & Borrowing</h1>
            </div>

            {/* Glass tab selector */}
            <div className="glass-nav" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: '6px 24px', height: 48, margin: '0 auto 36px', maxWidth: 420, zIndex: 10 }}>
              {[{key:'summary',label:'Summary'},{key:'details',label:'Individual Loan Details'}].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 500, color: activeTab === tab.key ? '#1A1918' : '#787776', background: activeTab === tab.key ? 'rgba(255,255,255,0.85)' : 'transparent', boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

        {/* Page content */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px' }}>

          {/* Next Payment Alert Banner */}
          {nextPaymentLoan && nextPaymentDays !== null && (
            <div className="glass-hero-alert" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: nextPaymentDays < 0 ? 'rgba(232,114,110,0.1)' : 'rgba(103,138,251,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock style={{ width: 16, height: 16, color: nextPaymentDays < 0 ? '#E8726E' : '#678AFB' }} />
                </div>
                <p style={{ fontSize: 13, color: '#1A1918', margin: 0 }}>
                  {nextPaymentDays > 0
                    ? <>Your next payment is due in <span style={{ fontWeight: 700 }}>{nextPaymentDays} {nextPaymentDays === 1 ? 'day' : 'days'}</span></>
                    : nextPaymentDays === 0
                      ? <span style={{ fontWeight: 700 }}>Your next payment is due today</span>
                      : <span style={{ fontWeight: 700, color: '#E8726E' }}>Your payment is {Math.abs(nextPaymentDays)} {Math.abs(nextPaymentDays) === 1 ? 'day' : 'days'} overdue</span>
                  }
                </p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', margin: 0 }}>
                ${nextPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* ═══ SUMMARY TAB ═══ */}
          {activeTab === 'summary' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="borrowing-grid">
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Total Active Borrowing */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '20px 26px 0' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Total Active Borrowing</span>
                  </div>
                  <div style={{ padding: '14px 26px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {activeLoans.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#787776' }}>No active loans</p>
                    ) : (() => {
                      const totalAll = activeLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
                      const paidAll = activeLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);
                      const pctAll = totalAll > 0 ? Math.round((paidAll / totalAll) * 100) : 0;
                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918' }}>Borrowing</div>
                            <div style={{ fontSize: 12, color: '#787776' }}>{pctAll}%</div>
                          </div>
                          <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'rgba(167,157,234,0.15)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 4, background: '#A79DEA', width: `${pctAll}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                          </div>
                          <div style={{ fontSize: 11, color: '#787776', marginTop: 6 }}>{formatMoney(paidAll)} of {formatMoney(totalAll)} paid back</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Your Borrowing */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '20px 26px 0' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Your Borrowing</span>
                  </div>
                  <div style={{ padding: '14px 26px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {activeLoans.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#787776' }}>No active loans to track</p>
                    ) : (
                      activeLoans.slice(0, 5).map(loan => {
                        const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                        const loanTotalOwed = loan.total_amount || loan.amount || 0;
                        const amountPaid = loan.amount_paid || 0;
                        const percentPaid = loanTotalOwed > 0 ? Math.round((amountPaid / loanTotalOwed) * 100) : 0;
                        return (
                          <div key={loan.id}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
                                {lender?.full_name || 'User'}{loan.purpose ? <span style={{ fontSize: 12, color: '#787776', fontWeight: 400 }}> · {loan.purpose}</span> : ''}
                              </div>
                              <div style={{ fontSize: 12, color: '#787776', flexShrink: 0, marginLeft: 8 }}>{percentPaid}%</div>
                            </div>
                            <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'rgba(167,157,234,0.15)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 4, background: '#A79DEA', width: `${percentPaid}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                            </div>
                            <div style={{ fontSize: 11, color: '#787776', marginTop: 6 }}>{formatMoney(amountPaid)} of {formatMoney(loanTotalOwed)} paid back</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Upcoming Payments */}
                {(() => {
                  const allPaymentLoans = activeLoans
                    .filter(l => l.next_payment_date)
                    .map(l => {
                      const lender = publicProfiles.find(p => p.user_id === l.lender_id);
                      const days = daysUntilDate(l.next_payment_date);
                      const payDate = toLocalDate(l.next_payment_date);
                      return { ...l, lenderUsername: lender?.full_name || 'User', days, payDate };
                    })
                    .sort((a, b) => a.payDate - b.payDate);
                  const overdueLoans = allPaymentLoans.filter(l => l.days < 0);
                  const upcomingLoans = allPaymentLoans.filter(l => l.days >= 0).slice(0, 5);
                  const combinedLoans = [...overdueLoans, ...upcomingLoans];
                  return (
                    <div className="glass-card">
                      <div style={{ padding: '20px 26px 0' }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Upcoming Payments</span>
                      </div>
                      <div style={{ padding: '14px 26px 26px' }}>
                        {combinedLoans.length === 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', color: '#787776' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: 6 }}>
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <p style={{ fontSize: 12 }}>No upcoming payments</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {combinedLoans.map(loan => {
                              const isOverdue = loan.days < 0;
                              const displayDays = isOverdue ? `-${Math.abs(loan.days)}` : loan.days;
                              return (
                                <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}>
                                  <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: isOverdue ? '#E8726E' : '#678AFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.2, margin: 0 }}>
                                      {displayDays}
                                      <span style={{ display: 'block', fontSize: 7, fontWeight: 500 }}>{Math.abs(loan.days) === 1 ? 'day' : 'days'}</span>
                                    </p>
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 11, color: '#1A1918', margin: 0 }}>
                                      Send <span style={{ fontWeight: 600 }}>${(loan.payment_amount || 0).toLocaleString()}</span> to <span style={{ fontWeight: 600 }}>{loan.lenderUsername}</span>
                                    </p>
                                    <p style={{ fontSize: 10, marginTop: 2, color: isOverdue ? '#E8726E' : '#787776', margin: 0 }}>{format(loan.payDate, 'MMM d, yyyy')}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Next Payment Box */}
                <div className="glass-card">
                  <div style={{ padding: '20px 26px 0' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Next Payment</span>
                  </div>
                  <div style={{ padding: '14px 26px 26px' }}>
                    {nextPaymentLoan ? (
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 11, color: '#787776', marginBottom: 2 }}>Next Payment Date</p>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1918', margin: 0 }}>{format(new Date(nextPaymentLoan.next_payment_date), 'EEE, MMM d')}</p>
                            {nextPaymentDays !== null && (
                              <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>{nextPaymentDays > 0 ? `${nextPaymentDays}d away` : nextPaymentDays === 0 ? 'Due today' : `${Math.abs(nextPaymentDays)}d overdue`}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, color: '#787776', marginBottom: 2 }}>Next Payment Amount</p>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(nextPaymentAmount)}</p>
                            <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>to {nextPaymentLenderUsername}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', color: '#787776' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: 6 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <p style={{ fontSize: 12 }}>No upcoming payments</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Overdue Payment Boxes */}
                {(() => {
                  const overdueLoans = activeLoans.filter(loan => {
                    if (!loan.next_payment_date) return false;
                    return daysUntilDate(loan.next_payment_date) < 0;
                  });
                  if (overdueLoans.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {overdueLoans.map(loan => {
                        const lender = getUserById(loan.lender_id);
                        const firstName = lender?.full_name?.split(' ')[0] || lender?.username || 'User';
                        return (
                          <div key={`overdue-${loan.id}`} className="glass-hero-alert" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8726E', flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: 13, color: '#787776', lineHeight: 1.5 }}>
                              <strong style={{ color: '#1A1918', fontWeight: 600 }}>Just a reminder</strong> you have a payment to {firstName} that is overdue. If you've already paid, make sure to record the payment so it's up to date.
                            </div>
                            <Link to={createPageUrl("RecordPayment")} style={{
                              padding: '7px 18px', borderRadius: 20, background: '#678AFB', color: 'white',
                              fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
                              fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s'
                            }}>Record Payment</Link>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Loans Ranked By */}
                {activeLoans.length > 0 && (
                  <div className="glass-card">
                    <div style={{ padding: '20px 26px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Loans Ranked By</span>
                      <Select value={rankingFilter} onValueChange={setRankingFilter}>
                        <SelectTrigger className="w-auto h-7 px-2 border-0 text-xs font-medium rounded-lg" style={{ background: 'rgba(103,138,251,0.1)', color: '#678AFB' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="highest_interest">Highest Interest</SelectItem>
                          <SelectItem value="highest_payment">Highest Payment</SelectItem>
                          <SelectItem value="soonest_deadline">Soonest Deadline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div style={{ padding: '14px 26px 26px', display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                            <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}>
                              <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'rgba(103,138,251,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#678AFB' }}>{idx + 1}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 11, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                  {lender?.full_name || 'User'} · {loan.purpose || 'Loan'}
                                </p>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1918', flexShrink: 0 }}>{rankValue}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ INDIVIDUAL LOAN DETAILS TAB ═══ */}
          {activeTab === 'details' && !isLoading && manageableLoans.length > 0 && (() => {

                      // Build payment chart data for selected loan using new financial logic
                      let chartData = [];
                      let plannedPaymentAmount = 0;
                      let recalculatedPayment = 0;
                      let loanAnalysis = null;
                      if (manageLoanSelected) {
                        const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id);
                        plannedPaymentAmount = manageLoanSelected.payment_amount || 0;

                        // Run full period-based analysis
                        loanAnalysis = analyzeLoanPayments(manageLoanSelected, allPayments, agreement);
                        recalculatedPayment = loanAnalysis ? loanAnalysis.recalcPayment : 0;

                        if (loanAnalysis) {
                          // Generate chart from period results — show ALL payments including in-progress
                          loanAnalysis.periodResults.forEach((pr, i) => {
                            const scheduledAmt = pr.scheduledAmount || (recalculatedPayment > 0 ? recalculatedPayment : plannedPaymentAmount);
                            if (pr.hasAnyPayments) {
                              // Period has payments — show actual total paid (confirmed + pending)
                              // Use scheduled amount as bar height so partial payments show proportionally
                              chartData.push({
                                label: `P${i + 1}`,
                                amount: pr.actualPaid,
                                scheduledAmount: scheduledAmt,
                                confirmedAmount: pr.confirmedPaid,
                                pendingAmount: pr.pendingPaid,
                                isPaid: true,
                                isProjected: false,
                                isFullPayment: pr.isFullPayment,
                                isInProgress: !pr.isPast && pr.hasAnyPayments,
                                hasPendingOnly: !pr.hasConfirmedPayments && pr.hasPendingPayments
                              });
                            } else if (pr.isPast) {
                              // Past period with no payment — missed
                              chartData.push({
                                label: `P${i + 1}`,
                                amount: 0,
                                scheduledAmount: scheduledAmt,
                                isPaid: false,
                                isProjected: false,
                                isMissed: true
                              });
                            } else {
                              // Future period — show projected amount (recalculated + any rollover)
                              const projectedAmount = i > 0 && loanAnalysis.periodResults[i - 1].deficit > 0
                                ? recalculatedPayment + loanAnalysis.periodResults[i - 1].deficit
                                : recalculatedPayment;
                              chartData.push({
                                label: `P${i + 1}`,
                                amount: projectedAmount,
                                scheduledAmount: scheduledAmt,
                                isPaid: false,
                                isProjected: true
                              });
                            }
                          });
                        }
                      }

                      const chartHeight = 110;
                      const maxChartVal = Math.max(plannedPaymentAmount, ...chartData.map(d => d.amount), 1);

                      return (
                        <div>
                          {/* Select a Loan */}
                          <div className="glass-card" style={{ marginBottom: 16 }}>
                            <div style={{ padding: '20px 26px 0' }}>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Select a Loan to Learn More</span>
                            </div>
                            <div style={{ padding: '14px 26px 26px' }}>
                              <div style={{ position: 'relative' }}>
                                <select
                                  value={manageLoanSelected?.id || ''}
                                  onChange={(e) => { const selected = manageableLoans.find(l => l.id === e.target.value); if (selected) setManageLoanSelected(selected); }}
                                  style={{ width: '100%', appearance: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#1A1918', background: 'rgba(103,138,251,0.08)', cursor: 'pointer', border: '1px solid rgba(103,138,251,0.2)', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                                >
                                  {manageableLoans.map((loan) => {
                                    const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                                    return (<option key={loan.id} value={loan.id}>{lender?.full_name || 'User'} — ${loan.amount?.toLocaleString()}{loan.status === 'cancelled' ? ' · Cancelled' : ''}</option>);
                                  })}
                                </select>
                                <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, bottom: 0, right: 10, display: 'flex', alignItems: 'center' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#678AFB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Summary bar */}
                          {manageLoanSelected && (() => {
                            const selLender = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                            return (
                              <div className="glass-hero-alert" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <img src={selLender?.profile_picture_url || selLender?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((selLender?.full_name || 'U').charAt(0))}&background=678AFB&color=fff&size=64`}
                                  alt={selLender?.full_name || 'Lender'} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'white' }} />
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', margin: 0 }}>
                                  {selLender?.full_name || 'User'} lent you ${(manageLoanSelected.amount || 0).toLocaleString()} to help with {manageLoanSelected.purpose || 'personal expenses'}
                                </p>
                              </div>
                            );
                          })()}

                          {/* Two-column grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="borrowing-grid">
                            {/* Left Column */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                              {/* Payment Progress */}
                              {manageLoanSelected && (() => {
                                const totalOwedNow = loanAnalysis ? loanAnalysis.totalOwedNow : (manageLoanSelected.total_amount || manageLoanSelected.amount || 0);
                                const totalPaidAmt = loanAnalysis ? loanAnalysis.totalPaid : (manageLoanSelected.amount_paid || 0);
                                const loanPrincipal = manageLoanSelected.amount || 0;
                                const totalWithInterest = loanAnalysis ? (loanAnalysis.principal + loanAnalysis.totalInterestAccrued) : (manageLoanSelected.total_amount || loanPrincipal);
                                const paidPct = loanAnalysis ? loanAnalysis.paidPercentage : (totalWithInterest > 0 ? (totalPaidAmt / totalWithInterest) * 100 : 0);
                                const selLender = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                                const lenderUsername = selLender?.full_name || 'User';
                                const nextPmtAmt = loanAnalysis ? loanAnalysis.nextPaymentAmount : (recalculatedPayment > 0 ? recalculatedPayment : (manageLoanSelected.payment_amount || 0));
                                let nextPmtDate = null; let daysUntil = null;
                                if (manageLoanSelected.next_payment_date) { nextPmtDate = toLocalDate(manageLoanSelected.next_payment_date); daysUntil = daysUntilDate(manageLoanSelected.next_payment_date); }
                                const size = 140; const dCx = size / 2; const dCy = size / 2; const outerR = 60; const innerR = 48;
                                const paidAngle = (paidPct / 100) * 360;
                                const toRad = (deg) => (deg - 90) * (Math.PI / 180);
                                const paidEndXo = dCx + outerR * Math.cos(toRad(paidAngle)); const paidEndYo = dCy + outerR * Math.sin(toRad(paidAngle));
                                const paidEndXi = dCx + innerR * Math.cos(toRad(paidAngle)); const paidEndYi = dCy + innerR * Math.sin(toRad(paidAngle));
                                const largeArc = paidAngle > 180 ? 1 : 0;
                                return (
                                  <div className="glass-card">
                                    <div style={{ padding: '20px 26px 0' }}>
                                      <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Payment Progress</span>
                                    </div>
                                    <div style={{ padding: '14px 26px 26px', display: 'flex', alignItems: 'center', gap: 16 }}>
                                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                                          <circle cx={dCx} cy={dCy} r={(outerR + innerR) / 2} fill="none" stroke="#E5E4E2" strokeWidth={outerR - innerR} />
                                          {paidPct > 0 && paidPct < 100 && (
                                            <path d={`M ${dCx} ${dCy - outerR} A ${outerR} ${outerR} 0 ${largeArc} 1 ${paidEndXo} ${paidEndYo} L ${paidEndXi} ${paidEndYi} A ${innerR} ${innerR} 0 ${largeArc} 0 ${dCx} ${dCy - innerR} Z`} fill="#678AFB" />
                                          )}
                                          {paidPct >= 100 && (<circle cx={dCx} cy={dCy} r={(outerR + innerR) / 2} fill="none" stroke="#678AFB" strokeWidth={outerR - innerR} />)}
                                          <text x={dCx} y={dCy - 5} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 15, fontWeight: 700, fill: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{Math.round(paidPct)}%</text>
                                          <text x={dCx} y={dCy + 10} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 8, fontWeight: 500, fill: '#787776', fontFamily: "'DM Sans', sans-serif" }}>repaid</text>
                                        </svg>
                                        <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', marginTop: 6, margin: 0 }}>
                                          ${totalPaidAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          <span style={{ color: '#787776', fontWeight: 400 }}> / ${totalOwedNow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </p>
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 4 }}>Next Payment</p>
                                        {nextPmtDate ? (
                                          <>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{format(nextPmtDate, 'MMM d, yyyy')}</p>
                                            <p style={{ fontSize: 10, color: '#787776', marginBottom: 12 }}>{daysUntil > 0 ? `Due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}` : daysUntil === 0 ? 'Due today' : `${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'day' : 'days'} overdue`}</p>
                                          </>
                                        ) : (<p style={{ fontSize: 12, color: '#C7C6C4', marginBottom: 12 }}>No upcoming payment</p>)}
                                        <p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 4 }}>Amount</p>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>${nextPmtAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p style={{ fontSize: 10, color: '#787776' }}>to {lenderUsername}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Quick Actions */}
                              {manageLoanSelected && manageLoanSelected.status !== 'cancelled' && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 20, padding: '4px 0' }}>
                                  <button onClick={() => handleMakePayment(manageLoanSelected)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: 'none' }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(103,138,251,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#678AFB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                    </div>
                                    <p style={{ fontSize: 10, fontWeight: 600, color: '#1A1918', textAlign: 'center', lineHeight: 1.3 }}>Record<br/>Payment</p>
                                  </button>
                                  <button onClick={() => handleEditLoan(manageLoanSelected)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: 'none' }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(103,138,251,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#678AFB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </div>
                                    <p style={{ fontSize: 10, fontWeight: 600, color: '#1A1918', textAlign: 'center', lineHeight: 1.3 }}>Request<br/>Loan Edit</p>
                                  </button>
                                  <button onClick={() => handleCancelLoan(manageLoanSelected)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: 'none' }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(103,138,251,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#678AFB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                    </div>
                                    <p style={{ fontSize: 10, fontWeight: 600, color: '#1A1918', textAlign: 'center', lineHeight: 1.3 }}>Request<br/>Cancellation</p>
                                  </button>
                                </div>
                              )}

                              <div className="glass-card">
                                <div style={{ padding: '20px 26px 0' }}>
                                  <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Payment History</span>
                                </div>
                                <div style={{ padding: '14px 26px 26px' }}>
                                {!manageLoanSelected ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: chartHeight }}>
                                    <p style={{ fontSize: 12, color: '#C7C6C4' }}>Select a loan to view chart</p>
                                  </div>
                                ) : chartData.length === 0 ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: chartHeight }}>
                                    <p style={{ fontSize: 12, color: '#C7C6C4' }}>No payment schedule</p>
                                  </div>
                                ) : (
                                  <div style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: chartHeight }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: 6, flexShrink: 0, height: '100%' }}>
                                        <p style={{ fontSize: 10, color: '#787776', margin: 0 }}>${maxChartVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                        <p style={{ fontSize: 10, color: '#787776', margin: 0 }}>${Math.round(maxChartVal / 2).toLocaleString()}</p>
                                        <p style={{ fontSize: 10, color: '#787776', margin: 0 }}>$0</p>
                                      </div>
                                      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', height: '100%' }}>
                                        {plannedPaymentAmount > 0 && (
                                          <div style={{ position: 'absolute', left: 0, right: 0, borderTop: '2px dashed rgba(103,138,251,0.3)', zIndex: 10, bottom: `${(plannedPaymentAmount / maxChartVal) * 100}%` }}>
                                            <span style={{ position: 'absolute', top: -14, right: 0, fontSize: 10, fontWeight: 600, color: '#787776', background: 'rgba(255,255,255,0.88)', padding: '0 4px' }}>${plannedPaymentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                          </div>
                                        )}
                                        {chartData.map((d, i) => {
                                          const barHeight = maxChartVal > 0 ? (d.amount / maxChartVal) * chartHeight : 0;
                                          const scheduledBarHeight = maxChartVal > 0 && d.scheduledAmount ? (d.scheduledAmount / maxChartVal) * chartHeight : barHeight;
                                          const isFullPmt = d.isPaid && d.isFullPayment;
                                          const isPartialPmt = d.isPaid && !d.isFullPayment && !d.hasPendingOnly;
                                          const isPendingOnly = d.hasPendingOnly;
                                          const isInProgress = d.isInProgress;
                                          return (
                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                                {isInProgress && !isFullPmt ? (
                                                  <div style={{ position: 'relative', height: Math.max(scheduledBarHeight, 4), width: 14 }}>
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', borderRadius: '4px 4px 0 0', background: 'rgba(103,138,251,0.1)', border: '1px dashed rgba(103,138,251,0.3)' }} />
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: Math.max(barHeight, 4), borderRadius: '4px 4px 0 0', background: 'rgba(103,138,251,0.6)' }} />
                                                  </div>
                                                ) : (
                                                  <div style={{
                                                    borderRadius: '4px 4px 0 0', transition: 'all 0.3s',
                                                    height: Math.max(barHeight, d.amount > 0 ? 4 : 2), width: 14,
                                                    background: d.isProjected ? 'rgba(103,138,251,0.15)' : d.isMissed ? 'rgba(232,114,110,0.3)' : d.amount === 0 ? '#E5E4E2' : isPendingOnly ? 'rgba(245,158,11,0.4)' : isFullPmt ? '#678AFB' : isPartialPmt ? 'rgba(245,158,11,0.6)' : 'rgba(103,138,251,0.6)',
                                                    border: d.isProjected ? '1px dashed rgba(103,138,251,0.3)' : d.isMissed ? '1px dashed rgba(232,114,110,0.5)' : isPendingOnly ? '1px dashed rgba(245,158,11,0.6)' : 'none',
                                                  }}
                                                  title={`${d.label}: $${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}${d.isProjected ? ' (projected)' : d.isMissed ? ' (missed)' : isPendingOnly ? ' (pending)' : isPartialPmt ? ' (partial)' : ''}`}
                                                  />
                                                )}
                                              </div>
                                              <p style={{ fontSize: 10, marginTop: 4, lineHeight: 1, margin: 0, color: isInProgress ? '#678AFB' : d.isProjected ? '#C7C6C4' : d.isMissed ? '#E8726E' : isPendingOnly ? 'rgba(245,158,11,0.6)' : '#787776' }}>{d.label}</p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    {/* Legend */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#678AFB' }} /><span style={{ fontSize: 9, color: '#787776' }}>Completed</span></div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(to top, rgba(103,138,251,0.6) 50%, rgba(103,138,251,0.1) 50%)' }} /><span style={{ fontSize: 9, color: '#678AFB' }}>In Progress</span></div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(245,158,11,0.4)', border: '1px dashed rgba(245,158,11,0.6)' }} /><span style={{ fontSize: 9, color: 'rgba(245,158,11,0.8)' }}>Pending</span></div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(103,138,251,0.15)', border: '1px dashed rgba(103,138,251,0.3)' }} /><span style={{ fontSize: 9, color: '#C7C6C4' }}>Projected</span></div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 0, borderTop: '2px dashed rgba(103,138,251,0.3)' }} /><span style={{ fontSize: 9, color: '#787776' }}>Plan</span></div>
                                    </div>
                                  </div>
                                )}
                                </div>
                              </div>
                            </div>

                            {/* Right Column */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {!manageLoanSelected ? (
                                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, padding: 26 }}>
                                  <div style={{ textAlign: 'center' }}>
                                    <ClipboardList style={{ width: 40, height: 40, margin: '0 auto 8px', color: '#C7C6C4' }} />
                                    <p style={{ fontSize: 13, color: '#787776' }}>Select a loan to view details</p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Loan Terms */}
                                  <div className="glass-card">
                                    <div style={{ padding: '20px 26px 0' }}>
                                      <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Loan Terms</span>
                                    </div>
                                    <div style={{ padding: '14px 26px 26px' }}>
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
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                          {items.map((item, idx) => (
                                            <div key={idx} style={{ textAlign: 'center' }}>
                                              <p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p>
                                              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                    </div>
                                  </div>

                                  {/* Document Icons */}
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 20, padding: '4px 0' }}>
                                    <button onClick={() => { const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id); if (agreement) openDocPopup('promissory', agreement); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: 'none' }}>
                                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(103,138,251,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#678AFB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                                      </div>
                                      <p style={{ fontSize: 10, fontWeight: 600, color: '#1A1918', textAlign: 'center', lineHeight: 1.3 }}>Promissory<br/>Note</p>
                                    </button>
                                    <button onClick={() => { const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id); if (agreement) openDocPopup('amortization', agreement); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: 'none' }}>
                                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(103,138,251,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#678AFB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                      </div>
                                      <p style={{ fontSize: 10, fontWeight: 600, color: '#1A1918', textAlign: 'center', lineHeight: 1.3 }}>Amortization<br/>Schedule</p>
                                    </button>
                                    <button onClick={() => { const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id); if (agreement) openDocPopup('summary', agreement); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: 'none' }}>
                                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(103,138,251,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#678AFB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                      </div>
                                      <p style={{ fontSize: 10, fontWeight: 600, color: '#1A1918', textAlign: 'center', lineHeight: 1.3 }}>Loan<br/>Summary</p>
                                    </button>
                                  </div>

                                  {/* Loan Progress Stats */}
                                  <div className="glass-card">
                                    <div style={{ padding: '20px 26px 0' }}>
                                      <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Loan Progress</span>
                                    </div>
                                    <div style={{ padding: '14px 26px 26px' }}>
                                    {(() => {
                                      const repaymentPeriod = manageLoanSelected.repayment_period || 0;
                                      const paymentFrequency = manageLoanSelected.payment_frequency || 'monthly';
                                      const lender = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                                      const lenderUsername = lender?.full_name || 'User';
                                      const totalOwedDisplay = loanAnalysis ? loanAnalysis.totalOwedNow : (manageLoanSelected.total_amount || manageLoanSelected.amount || 0);
                                      const amountPaidDisplay = loanAnalysis ? loanAnalysis.totalPaid : (manageLoanSelected.amount_paid || 0);
                                      const fullPayments = loanAnalysis ? loanAnalysis.fullPaymentCount : 0;
                                      const paymentAmountDisplay = loanAnalysis ? loanAnalysis.nextPaymentAmount : (recalculatedPayment > 0 ? recalculatedPayment : (manageLoanSelected.payment_amount || 0));
                                      const freqLabel = paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1);
                                      const items = [
                                        { label: 'Total Owed', value: `$${totalOwedDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'with interest' },
                                        { label: 'Amount Paid', value: `$${amountPaidDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: null },
                                        { label: 'Payments Made', value: `${fullPayments}/${repaymentPeriod}`, sub: 'full payments' },
                                        { label: `${freqLabel} Payments`, value: `$${paymentAmountDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: `to ${lenderUsername}` },
                                      ];
                                      return (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                          {items.map((item, idx) => (
                                            <div key={idx} style={{ textAlign: 'center' }}>
                                              <p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p>
                                              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p>
                                              {item.sub && <p style={{ fontSize: 9, color: '#787776', marginTop: 2 }}>{item.sub}</p>}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                    </div>
                                  </div>

                                  {/* Payments */}
                                  <div className="glass-card">
                                    <div style={{ padding: '20px 26px 0' }}>
                                      <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Payments</span>
                                    </div>
                                    <div style={{ padding: '14px 26px 26px' }}>
                                    {(() => {
                                      const paymentAmt = manageLoanSelected.payment_amount || 0;
                                      let firstRecordFound = false;
                                      const paymentRows = loanAnalysis ? loanAnalysis.periodResults.map((pr) => {
                                        let status;
                                        if (pr.hasConfirmedPayments && pr.isFullPayment) status = 'completed';
                                        else if (pr.hasAnyPayments && !pr.isPast) status = 'in_progress';
                                        else if (pr.hasConfirmedPayments && !pr.isFullPayment) status = 'partial';
                                        else if (pr.hasPendingPayments && !pr.hasConfirmedPayments) status = 'pending';
                                        else if (pr.isPast && !pr.hasAnyPayments) status = 'missed';
                                        else if (!firstRecordFound) { status = 'record'; firstRecordFound = true; }
                                        else status = 'upcoming';
                                        const scheduledAmount = pr.scheduledAmount || (loanAnalysis.recalcPayment > 0 ? loanAnalysis.recalcPayment : paymentAmt);
                                        const paidAmount = pr.actualPaid || 0;
                                        const paidPercentage = scheduledAmount > 0 ? Math.min(100, (paidAmount / scheduledAmount) * 100) : 0;
                                        return { number: pr.period, date: pr.date, amount: scheduledAmount, paidAmount, paidPercentage, status, isFullPayment: pr.isFullPayment, deficit: pr.deficit };
                                      }) : [];
                                      const statusConfig = {
                                        completed: { label: 'Completed', bg: 'rgba(103,138,251,0.1)', text: '#678AFB', ringColor: '#678AFB', fillColor: '#678AFB' },
                                        in_progress: { label: 'In Progress', bg: 'rgba(103,138,251,0.1)', text: '#678AFB', ringColor: '#678AFB', fillColor: '#678AFB' },
                                        partial: { label: 'Partial', bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', ringColor: '#F59E0B', fillColor: '#F59E0B' },
                                        pending: { label: 'Pending', bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', ringColor: '#F59E0B', fillColor: '#F59E0B' },
                                        missed: { label: 'Missed', bg: 'rgba(232,114,110,0.1)', text: '#E8726E', ringColor: '#E8726E', fillColor: '#E8726E' },
                                        record: { label: 'Record Payment', bg: '#678AFB', text: 'white', ringColor: '#678AFB', fillColor: '#678AFB' },
                                        upcoming: { label: 'Upcoming', bg: 'rgba(0,0,0,0.03)', text: '#787776', ringColor: 'rgba(103,138,251,0.3)', fillColor: 'rgba(103,138,251,0.3)' },
                                      };
                                      const PieCircle = ({ percentage, ringColor, fillColor, number, size = 32 }) => {
                                        const r = (size / 2) - 2; const pcx = size / 2; const pcy = size / 2;
                                        const circumference = 2 * Math.PI * r; const filled = (percentage / 100) * circumference;
                                        return (
                                          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
                                            <circle cx={pcx} cy={pcy} r={r} fill="#F5F4F0" stroke={ringColor} strokeWidth="2" strokeOpacity="0.3" />
                                            {percentage > 0 && (<circle cx={pcx} cy={pcy} r={r} fill="none" stroke={fillColor} strokeWidth="2" strokeDasharray={`${filled} ${circumference - filled}`} strokeDashoffset={circumference * 0.25} strokeLinecap="round" transform={`rotate(-90 ${pcx} ${pcy})`} />)}
                                            <text x={pcx} y={pcy} textAnchor="middle" dominantBaseline="central" fill="#1A1918" fontSize="11" fontWeight="bold" fontFamily="'DM Sans', sans-serif">{number}</text>
                                          </svg>
                                        );
                                      };
                                      return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                                          {paymentRows.map((row) => {
                                            const cfg = statusConfig[row.status];
                                            return (
                                              <div key={row.number} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}>
                                                <PieCircle percentage={row.paidPercentage} ringColor={cfg.ringColor} fillColor={cfg.fillColor} number={row.number} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', margin: 0 }}>${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                  <p style={{ fontSize: 10, color: '#787776', margin: 0 }}>{format(row.date, 'MMM d, yyyy')}</p>
                                                </div>
                                                {row.status === 'record' ? (
                                                  <button onClick={() => handleMakePayment(manageLoanSelected)} style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: cfg.bg, color: cfg.text, border: 'none', cursor: 'pointer' }}>{cfg.label}</button>
                                                ) : (
                                                  <span style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })()}
                                    </div>
                                  </div>

                                  {/* Activity Box */}
                                  <div className="glass-card" style={{ overflow: 'hidden' }}>
                                    <div style={{ padding: '20px 26px 0' }}>
                                      <p style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em', marginBottom: 10, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                        Activity
                                      </p>
                                    </div>
                                    <div style={{ padding: '14px 26px 26px' }}>
                                    {(() => {
                                      const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id);
                                      const loanPmts = allPayments.filter(p => p.loan_id === manageLoanSelected.id);
                                      const lenderProfile = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                                      const borrowerProfile = publicProfiles.find(p => p.user_id === user?.id);
                                      const lenderName = lenderProfile?.full_name || 'Lender';
                                      const borrowerName = borrowerProfile?.full_name || 'You';

                                      const activities = [];

                                      // Loan created
                                      if (manageLoanSelected.created_at) {
                                        activities.push({
                                          timestamp: new Date(manageLoanSelected.created_at),
                                          type: 'created',
                                          description: `Loan created between ${borrowerName} and ${lenderName}`,
                                        });
                                      }

                                      // Borrower signature
                                      if (agreement?.borrower_signed_date) {
                                        activities.push({
                                          timestamp: new Date(agreement.borrower_signed_date),
                                          type: 'signature',
                                          description: `${borrowerName} signed the loan agreement`,
                                        });
                                      }

                                      // Lender signature
                                      if (agreement?.lender_signed_date) {
                                        activities.push({
                                          timestamp: new Date(agreement.lender_signed_date),
                                          type: 'signature',
                                          description: `${lenderName} signed the loan agreement`,
                                        });
                                      }

                                      // Payments
                                      loanPmts.forEach(payment => {
                                        const isConfirmed = payment.status === 'confirmed';
                                        const isRecordedByUser = payment.recorded_by === user?.id;
                                        const otherPartyProfile = publicProfiles.find(p => p.user_id === (isRecordedByUser
                                          ? (manageLoanSelected.lender_id === user?.id ? manageLoanSelected.borrower_id : manageLoanSelected.lender_id)
                                          : payment.recorded_by));
                                        const otherPartyUsername = otherPartyProfile?.full_name || 'User';
                                        const pmtAmount = `$${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                        let desc;
                                        if (isRecordedByUser) {
                                          desc = `You ${isConfirmed ? 'made' : 'recorded'} a ${pmtAmount} payment to ${lenderName}`;
                                        } else {
                                          desc = `${otherPartyUsername} recorded a ${pmtAmount} payment from ${borrowerName}`;
                                        }
                                        activities.push({
                                          timestamp: new Date(payment.payment_date || payment.created_at),
                                          type: 'payment',
                                          description: desc,
                                          isAwaitingConfirmation: !isConfirmed,
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

                                      // Sort oldest first (chronological order)
                                      activities.sort((a, b) => a.timestamp - b.timestamp);

                                      const getIcon = (type) => {
                                        const strokeColor = type === 'cancellation' ? '#E8726E' : '#678AFB';
                                        switch (type) {
                                          case 'created':
                                            return (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                              </svg>
                                            );
                                          case 'signature':
                                            return (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                              </svg>
                                            );
                                          case 'payment':
                                            return (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                              </svg>
                                            );
                                          case 'cancellation':
                                            return (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            );
                                          case 'completion':
                                            return (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={strokeColor} strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            );
                                          default:
                                            return null;
                                        }
                                      };

                                      const getDotColor = (type) => {
                                        switch (type) {
                                          case 'cancellation': return 'bg-red-50 border-[#E8726E]';
                                          default: return 'bg-blue-50 border-[#678AFB]';
                                        }
                                      };

                                      if (activities.length === 0) {
                                        return (
                                          <p style={{ fontSize: 11, color: '#C7C6C4', fontFamily: "'DM Sans', system-ui, sans-serif" }}>No activity recorded yet.</p>
                                        );
                                      }

                                      return (
                                        <div className="space-y-0 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                          {activities.map((activity, idx) => (
                                            <div key={idx} className="flex items-start gap-2.5 relative">
                                              {/* Timeline line */}
                                              {idx < activities.length - 1 && (
                                                <div className="absolute left-[11px] top-[22px] w-[1px]" style={{ height: 'calc(100% - 6px)', background: 'rgba(103,138,251,0.2)' }} />
                                              )}
                                              {/* Icon dot */}
                                              <div className={`w-[23px] h-[23px] rounded-full border-[1.5px] ${getDotColor(activity.type)} flex items-center justify-center flex-shrink-0 z-10 mt-1`}>
                                                {getIcon(activity.type)}
                                              </div>
                                              {/* Content */}
                                              <div className="flex-1 min-w-0 pb-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <p style={{ fontSize: 11, color: '#1A1918', fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.4 }}>
                                                    {activity.description}
                                                  </p>
                                                  {activity.isAwaitingConfirmation && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 whitespace-nowrap">
                                                      Awaiting Confirmation
                                                    </span>
                                                  )}
                                                </div>
                                                <p style={{ fontSize: 9, color: '#C7C6C4', fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: 2 }}>
                                                  {format(activity.timestamp, 'MMM d, yyyy · h:mm a')}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                    </div>
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

        </div>
          </div>{/* end zIndex:2 wrapper */}
        </div>{/* end content box */}

        {/* Footer */}
        <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 11, color: '#787776' }}>Terms of Service</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Privacy Center</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Do not sell or share my personal information</span>
          </div>
        </div>
      </div>

      {/* Modals */}
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
        <AlertDialogContent className="rounded-2xl border-0 p-0 overflow-hidden" style={{ backgroundColor: '#F5F4F0' }}>
          <div className="p-6 pb-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1A1918' }}>Cancel Loan</AlertDialogTitle>
              <AlertDialogDescription className="text-sm mt-1" style={{ color: '#787776' }}>
                Are you sure you want to cancel this loan? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl border-0 font-semibold text-white text-[14px] h-12 hover:opacity-90 transition-all" style={{ backgroundColor: '#678AFB' }}>
              Keep Loan
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelLoan} className="flex-1 rounded-xl border-0 font-semibold text-white text-[14px] h-12 hover:opacity-90 transition-all" style={{ backgroundColor: '#E8726E' }}>
              Request Loan Cancellation
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

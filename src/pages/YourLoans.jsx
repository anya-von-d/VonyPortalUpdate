import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, User, LoanAgreement, PublicProfile, Friendship } from "@/entities/all";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock, Calendar, DollarSign, AlertCircle, FileText, BarChart3,
  Pencil, X, Save, FolderOpen, ClipboardList, Info, Percent, History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, addMonths, addWeeks } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import LoanDetailsModal from "@/components/loans/LoanDetailsModal";
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

export default function YourLoans() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'lending');
  const [allLoans, setAllLoans] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [loanAgreements, setLoanAgreements] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loanToCancel, setLoanToCancel] = useState(null);
  const [manageLoanSelected, setManageLoanSelected] = useState(null);
  const [manageLoanInitialized, setManageLoanInitialized] = useState(false);
  const [rankingFilterLending, setRankingFilterLending] = useState('highest_interest');
  const [rankingFilterBorrowing, setRankingFilterBorrowing] = useState('highest_interest');
  const [activeDocPopup, setActiveDocPopup] = useState(null);
  const [docPopupAgreement, setDocPopupAgreement] = useState(null);
  const [showEditLoanModal, setShowEditLoanModal] = useState(false);
  const [editLoanData, setEditLoanData] = useState(null);
  const [reminderSlide, setReminderSlide] = useState(0);
  const [infoTooltip, setInfoTooltip] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    let currentUser = null;
    try {
      currentUser = await User.me();
      setUser(currentUser);
    } catch {
      setIsLoading(false);
      return;
    }
    try {
      const [loans, profiles, agreements, payments] = await Promise.all([
        Loan.list('-created_at').catch(() => []),
        PublicProfile.list().catch(() => []),
        LoanAgreement.list().catch(() => []),
        Payment.list('-payment_date').catch(() => [])
      ]);
      const userLoans = (loans || []).filter(l => l.lender_id === currentUser.id || l.borrower_id === currentUser.id);
      setAllLoans(userLoans);
      setPublicProfiles(profiles || []);
      setLoanAgreements(agreements || []);
      setAllPayments(payments || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  // Split loans by role
  const lendingLoans = allLoans.filter(l => l.lender_id === user?.id);
  const borrowingLoans = allLoans.filter(l => l.borrower_id === user?.id);
  const activeLendingLoans = lendingLoans.filter(l => l.status === 'active');
  const activeBorrowingLoans = borrowingLoans.filter(l => l.status === 'active');

  const allOverdueForEffect = activeTab === 'lending'
    ? activeLendingLoans.filter(l => l.next_payment_date && daysUntilDate(l.next_payment_date) < 0)
    : activeBorrowingLoans.filter(l => l.next_payment_date && daysUntilDate(l.next_payment_date) < 0);
  useEffect(() => {
    setReminderSlide(0);
  }, [activeTab]);
  useEffect(() => {
    if (allOverdueForEffect.length <= 1) return;
    const timer = setInterval(() => setReminderSlide(prev => (prev + 1) % allOverdueForEffect.length), 8000);
    return () => clearInterval(timer);
  }, [allOverdueForEffect.length]);

  // All manageable loans for details tab (both lending and borrowing)
  const allManageableLoans = allLoans.filter(l => l.status === 'active' || l.status === 'cancelled');

  useEffect(() => {
    if (!manageLoanInitialized && allManageableLoans.length > 0) {
      setManageLoanSelected(allManageableLoans[0]);
      setManageLoanInitialized(true);
    }
  }, [allManageableLoans, manageLoanInitialized]);

  // Determine if selected loan is lending or borrowing
  const isLendingLoan = manageLoanSelected ? manageLoanSelected.lender_id === user?.id : false;

  // --- Lending summary stats ---
  const totalLent = activeLendingLoans.reduce((s, l) => s + (l.amount || 0), 0);
  const totalExpectedLending = activeLendingLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
  const totalReceivedLending = activeLendingLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);

  const nextPaymentLoanLending = activeLendingLoans
    .filter(l => l.next_payment_date)
    .map(l => ({ ...l, date: new Date(l.next_payment_date) }))
    .sort((a, b) => a.date - b.date)[0];
  const nextPaymentDaysLending = nextPaymentLoanLending ? daysUntilDate(nextPaymentLoanLending.next_payment_date) : null;
  const nextPaymentAmountLending = (() => {
    if (!nextPaymentLoanLending) return 0;
    const agreement = loanAgreements.find(a => a.loan_id === nextPaymentLoanLending.id);
    const analysis = analyzeLoanPayments(nextPaymentLoanLending, allPayments, agreement);
    if (analysis && analysis.nextPaymentAmount > 0) return analysis.nextPaymentAmount;
    return nextPaymentLoanLending.payment_amount || 0;
  })();
  const nextPaymentBorrowerUsername = nextPaymentLoanLending
    ? publicProfiles.find(p => p.user_id === nextPaymentLoanLending.borrower_id)?.full_name || 'User' : null;

  // --- Borrowing summary stats ---
  const totalBorrowed = activeBorrowingLoans.reduce((s, l) => s + (l.amount || 0), 0);
  const totalOwedBorrowing = activeBorrowingLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
  const totalPaidBorrowing = activeBorrowingLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);

  const nextPaymentLoanBorrowing = activeBorrowingLoans
    .filter(l => l.next_payment_date)
    .map(l => ({ ...l, date: new Date(l.next_payment_date) }))
    .sort((a, b) => a.date - b.date)[0];
  const nextPaymentDaysBorrowing = nextPaymentLoanBorrowing ? daysUntilDate(nextPaymentLoanBorrowing.next_payment_date) : null;
  const nextPaymentAmountBorrowing = (() => {
    if (!nextPaymentLoanBorrowing) return 0;
    const agreement = loanAgreements.find(a => a.loan_id === nextPaymentLoanBorrowing.id);
    const analysis = analyzeLoanPayments(nextPaymentLoanBorrowing, allPayments, agreement);
    if (analysis && analysis.nextPaymentAmount > 0) return analysis.nextPaymentAmount;
    return nextPaymentLoanBorrowing.payment_amount || 0;
  })();
  const nextPaymentLenderUsername = nextPaymentLoanBorrowing
    ? publicProfiles.find(p => p.user_id === nextPaymentLoanBorrowing.lender_id)?.full_name || 'User' : null;

  // --- Shared helpers ---
  const handleMakePayment = () => { window.location.href = createPageUrl("RecordPayment"); };
  const getUserById = (userId) => {
    const profile = publicProfiles.find(p => p.user_id === userId);
    return profile || { username: 'user', full_name: 'Unknown User' };
  };
  const getAgreementForLoan = (loanId) => loanAgreements.find(a => a.loan_id === loanId);

  const handleCancelLoan = (loan) => { setLoanToCancel(loan); setShowCancelDialog(true); };
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

  const openDocPopup = (type, agreement) => { setActiveDocPopup(type); setDocPopupAgreement(agreement); };
  const closeDocPopup = () => { setActiveDocPopup(null); setDocPopupAgreement(null); };

  const handleEditLoan = (loan) => {
    if (loan.lender_id === user?.id) {
      setEditLoanData({
        id: loan.id, amount: loan.amount || 0, interest_rate: loan.interest_rate || 0,
        repayment_period: loan.repayment_period || 0, payment_frequency: loan.payment_frequency || 'monthly',
        due_date: loan.due_date || '', payment_amount: loan.payment_amount || 0,
        purpose: loan.purpose || '', notes: ''
      });
      setShowEditLoanModal(true);
    } else {
      alert('Loan edit request functionality coming soon');
    }
  };

  const handleSaveEditLoan = async () => {
    if (!editLoanData || !manageLoanSelected) return;
    try {
      const amount = parseFloat(editLoanData.amount) || 0;
      const interestRate = parseFloat(editLoanData.interest_rate) || 0;
      const period = parseInt(editLoanData.repayment_period) || 0;
      const totalAmount = amount * (1 + (interestRate / 100) * (period / 12));
      let paymentAmount = editLoanData.payment_amount;
      if (editLoanData.payment_frequency !== 'none' && period > 0) {
        switch (editLoanData.payment_frequency) {
          case 'daily': paymentAmount = totalAmount / (period * 30); break;
          case 'weekly': paymentAmount = totalAmount / (period * (52 / 12)); break;
          case 'biweekly': paymentAmount = totalAmount / (period * (26 / 12)); break;
          default: paymentAmount = totalAmount / period;
        }
      }
      const changes = [];
      if (parseFloat(editLoanData.amount) !== manageLoanSelected.amount) changes.push(`Amount: $${manageLoanSelected.amount} → $${editLoanData.amount}`);
      if (parseFloat(editLoanData.interest_rate) !== manageLoanSelected.interest_rate) changes.push(`Interest Rate: ${manageLoanSelected.interest_rate}% → ${editLoanData.interest_rate}%`);
      if (parseInt(editLoanData.repayment_period) !== manageLoanSelected.repayment_period) changes.push(`Repayment Period: ${manageLoanSelected.repayment_period} → ${editLoanData.repayment_period} months`);
      if (editLoanData.payment_frequency !== manageLoanSelected.payment_frequency) changes.push(`Payment Frequency: ${manageLoanSelected.payment_frequency} → ${editLoanData.payment_frequency}`);
      const changeLog = changes.length > 0 ? changes.join('; ') : 'No changes';
      await Loan.update(editLoanData.id, {
        amount: parseFloat(editLoanData.amount), interest_rate: parseFloat(editLoanData.interest_rate),
        repayment_period: parseInt(editLoanData.repayment_period), payment_frequency: editLoanData.payment_frequency,
        due_date: editLoanData.due_date, total_amount: totalAmount, payment_amount: paymentAmount,
        purpose: editLoanData.purpose, contract_modified: true,
        contract_modified_date: new Date().toISOString(),
        contract_modification_notes: editLoanData.notes || changeLog,
        status: 'pending_borrower_approval'
      });
      setShowEditLoanModal(false);
      setEditLoanData(null);
      await loadData();
    } catch (error) {
      console.error("Error saving loan edit:", error);
    }
  };

  // --- Financial analysis functions ---
  function generateAmortizationSchedule(agreement) {
    const schedule = [];
    const loanAmount = agreement.amount || 0;
    const frequency = agreement.payment_frequency || 'monthly';
    const annualRate = agreement.interest_rate || 0;
    if (loanAmount <= 0) return schedule;
    const repaymentPeriod = agreement.repayment_period || 1;
    const repaymentUnit = agreement.repayment_unit || 'months';
    let totalMonths = repaymentPeriod;
    if (repaymentUnit === 'years') totalMonths = repaymentPeriod * 12;
    else if (repaymentUnit === 'weeks') totalMonths = repaymentPeriod / 4.333;
    let totalPayments;
    if (frequency === 'weekly') totalPayments = Math.round(totalMonths * 4.333);
    else if (frequency === 'biweekly') totalPayments = Math.round(totalMonths * 2.167);
    else if (frequency === 'daily') totalPayments = Math.round(totalMonths * 30.417);
    else totalPayments = Math.round(totalMonths);
    if (totalPayments <= 0) totalPayments = 1;
    let periodsPerYear = 12;
    if (frequency === 'weekly') periodsPerYear = 52;
    else if (frequency === 'biweekly') periodsPerYear = 26;
    else if (frequency === 'daily') periodsPerYear = 365;
    const r = annualRate > 0 ? (annualRate / 100) / periodsPerYear : 0;
    let rawPayment;
    if (r > 0) { rawPayment = loanAmount * r / (1 - Math.pow(1 + r, -totalPayments)); }
    else { rawPayment = loanAmount / totalPayments; }
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
      if (i === totalPayments) { principal = balance; balance = 0; }
      else { const newBalance = Math.round((balance * (1 + r) - rawPayment) * 100) / 100; principal = Math.round((startingBalance - newBalance) * 100) / 100; balance = newBalance; }
      principalToDate = Math.round((principalToDate + principal) * 100) / 100;
      interestToDate = Math.round((interestToDate + interest) * 100) / 100;
      schedule.push({ number: i, date: new Date(currentDate), startingBalance, principal, interest, principalToDate, interestToDate, endingBalance: balance });
    }
    return schedule;
  }

  function analyzeLoanPayments(loan, payments, agreement) {
    if (!loan) return null;
    const principal = loan.amount || 0;
    const annualRate = loan.interest_rate || 0;
    const totalPeriods = loan.repayment_period || 1;
    const frequency = loan.payment_frequency || 'monthly';
    const originalPaymentAmount = loan.payment_amount || 0;
    let periodsPerYear = 12;
    if (frequency === 'weekly') periodsPerYear = 52;
    else if (frequency === 'biweekly') periodsPerYear = 26;
    else if (frequency === 'daily') periodsPerYear = 365;
    const r = annualRate > 0 ? (annualRate / 100) / periodsPerYear : 0;
    const confirmedPayments = payments.filter(p => p.loan_id === loan.id && (p.status === 'confirmed' || p.status === 'completed')).sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
    const allLoanPayments = payments.filter(p => p.loan_id === loan.id && (p.status === 'confirmed' || p.status === 'completed' || p.status === 'pending_confirmation')).sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
    let scheduleDates = [];
    if (agreement) { const sched = generateAmortizationSchedule(agreement); scheduleDates = sched.map(s => s.date); }
    else { let dt = new Date(loan.created_at); for (let i = 0; i < totalPeriods; i++) { if (frequency === 'weekly') dt = addWeeks(new Date(dt), 1); else if (frequency === 'biweekly') dt = addWeeks(new Date(dt), 2); else if (frequency === 'daily') dt = addDays(new Date(dt), 1); else dt = addMonths(new Date(dt), 1); scheduleDates.push(new Date(dt)); } }
    const loanStart = new Date(loan.created_at);
    const periodConfirmedPayments = [];
    const periodAllPayments = [];
    const effectivePeriods = Math.min(totalPeriods, scheduleDates.length);
    for (let i = 0; i < effectivePeriods; i++) {
      const periodStart = i === 0 ? loanStart : scheduleDates[i - 1];
      const periodEnd = scheduleDates[i];
      periodConfirmedPayments.push(confirmedPayments.filter(p => { const pDate = new Date(p.payment_date); return pDate > periodStart && pDate <= periodEnd; }));
      periodAllPayments.push(allLoanPayments.filter(p => { const pDate = new Date(p.payment_date); return pDate > periodStart && pDate <= periodEnd; }));
    }
    if (scheduleDates.length > 0) {
      const lastDate = scheduleDates[scheduleDates.length - 1];
      const lateConfirmed = confirmedPayments.filter(p => new Date(p.payment_date) > lastDate);
      const lateAll = allLoanPayments.filter(p => new Date(p.payment_date) > lastDate);
      if (lateConfirmed.length > 0 && effectivePeriods > 0) periodConfirmedPayments[effectivePeriods - 1] = [...periodConfirmedPayments[effectivePeriods - 1], ...lateConfirmed];
      if (lateAll.length > 0 && effectivePeriods > 0) periodAllPayments[effectivePeriods - 1] = [...periodAllPayments[effectivePeriods - 1], ...lateAll];
    }
    let remainingPrincipal = principal;
    let totalInterestAccrued = 0;
    let totalPaid = 0;
    let fullPaymentCount = 0;
    let deficit = 0;
    const periodResults = [];
    for (let i = 0; i < effectivePeriods; i++) {
      const periodInterest = Math.round(remainingPrincipal * r * 100) / 100;
      totalInterestAccrued += periodInterest;
      const scheduledAmount = originalPaymentAmount + deficit;
      const confirmedPaidSum = periodConfirmedPayments[i].reduce((sum, p) => sum + (p.amount || 0), 0);
      totalPaid += confirmedPaidSum;
      const allPaidSum = periodAllPayments[i].reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingPaidSum = allPaidSum - confirmedPaidSum;
      const isFullPayment = confirmedPaidSum >= scheduledAmount && scheduledAmount > 0;
      if (isFullPayment) fullPaymentCount++;
      let periodDeficit = 0;
      if (confirmedPaidSum < scheduledAmount) periodDeficit = Math.round((scheduledAmount - confirmedPaidSum) * 100) / 100;
      let paymentToInterest = Math.min(confirmedPaidSum, periodInterest);
      let paymentToPrincipal = Math.max(0, confirmedPaidSum - paymentToInterest);
      remainingPrincipal = Math.max(0, Math.round((remainingPrincipal - paymentToPrincipal) * 100) / 100);
      const isPast = toLocalDate(scheduleDates[i]) <= getLocalToday();
      periodResults.push({
        period: i + 1, date: scheduleDates[i], scheduledAmount: Math.round(scheduledAmount * 100) / 100,
        confirmedPaid: Math.round(confirmedPaidSum * 100) / 100, pendingPaid: Math.round(pendingPaidSum * 100) / 100,
        actualPaid: Math.round(allPaidSum * 100) / 100, isFullPayment, isPast,
        hasConfirmedPayments: periodConfirmedPayments[i].length > 0,
        hasPendingPayments: periodAllPayments[i].length > periodConfirmedPayments[i].length,
        hasAnyPayments: periodAllPayments[i].length > 0,
        deficit: periodDeficit, interestThisPeriod: periodInterest, remainingPrincipal,
        confirmedPayments: periodConfirmedPayments[i], allPayments: periodAllPayments[i]
      });
      deficit = periodDeficit;
    }
    const totalOwedNow = Math.max(0, Math.round((principal + totalInterestAccrued - totalPaid) * 100) / 100);
    const unpaidPeriods = totalPeriods - fullPaymentCount;
    const recalcPayment = unpaidPeriods > 0 && totalOwedNow > 0 ? Math.round((totalOwedNow / unpaidPeriods) * 100) / 100 : 0;
    const currentPeriodIdx = periodResults.findIndex(p => !p.isPast || (p.isPast && !p.hasConfirmedPayments));
    const nextPeriodDeficit = currentPeriodIdx > 0 ? periodResults[currentPeriodIdx - 1]?.deficit || 0 : 0;
    const nextPaymentAmt = recalcPayment > 0 ? Math.round((recalcPayment + nextPeriodDeficit) * 100) / 100 : originalPaymentAmount;
    return {
      principal, totalOwedNow, totalPaid, totalInterestAccrued, remainingPrincipal, fullPaymentCount, totalPeriods,
      recalcPayment, nextPaymentAmount: nextPaymentAmt, originalPaymentAmount, periodResults,
      deficit: periodResults.length > 0 ? periodResults[periodResults.length - 1].deficit : 0,
      paidPercentage: (principal + totalInterestAccrued) > 0 ? Math.min(100, (totalPaid / (principal + totalInterestAccrued)) * 100) : 0
    };
  }

  // --- Document Popups ---
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
            {agreement.borrower_signed_date && <p className="text-xs text-slate-500 mt-1">Signed {format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy')}</p>}
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 mb-1">Lender</p>
            <p className="text-lg font-serif italic text-slate-800">{agreement.lender_name || lenderInfo.full_name}</p>
            {agreement.lender_signed_date && <p className="text-xs text-slate-500 mt-1">Signed {format(new Date(agreement.lender_signed_date), 'MMM d, yyyy')}</p>}
          </div>
        </div>
      </div>
    );
  };

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
          <div className="bg-[#83F384] rounded-xl p-3 text-center"><p className="text-xs text-slate-600">Principal</p><p className="text-lg font-bold text-slate-800">{formatMoney(agreement.amount)}</p></div>
          <div className="bg-[#83F384] rounded-xl p-3 text-center"><p className="text-xs text-slate-600">Interest</p><p className="text-lg font-bold text-slate-800">{formatMoney((agreement.total_amount || 0) - (agreement.amount || 0))}</p></div>
          <div className="bg-[#83F384] rounded-xl p-3 text-center"><p className="text-xs text-slate-600">Total</p><p className="text-lg font-bold text-slate-800">{formatMoney(agreement.total_amount)}</p></div>
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
                <tr key={row.number} className={index < paidPayments ? 'bg-green-50' : ''}>
                  <td className="px-2 py-2 text-slate-600">{row.number}</td>
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

  const LoanSummaryPopup = ({ agreement }) => {
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);
    const loan = manageLoanSelected;
    const getStatusColor = (status) => {
      switch(status) { case 'active': return 'bg-green-100 text-green-800 border-green-200'; case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200'; case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'; default: return 'bg-gray-100 text-gray-800 border-gray-200'; }
    };
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div><h2 className="text-2xl font-bold text-slate-800">Loan Summary</h2><p className="text-sm text-slate-500 mt-1">{format(new Date(agreement.created_at), 'MMMM d, yyyy')}</p></div>
          <Badge className={`${getStatusColor(loan?.status)} capitalize`}>{loan?.status || 'active'}</Badge>
        </div>
        <div className="bg-[#83F384] rounded-xl p-4 mb-1"><p className="text-xs text-slate-600 mb-1">Purpose</p><p className="text-sm font-semibold text-slate-800">{loan?.purpose || agreement.purpose || 'Reason'}</p></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#83F384] rounded-xl p-4"><p className="text-xs text-slate-600 mb-1">Loan Amount</p><p className="text-2xl font-bold text-slate-800">{formatMoney(agreement.amount)}</p></div>
          <div className="bg-[#83F384] rounded-xl p-4"><p className="text-xs text-slate-600 mb-1">Total Due</p><p className="text-2xl font-bold text-[#00A86B]">{formatMoney(agreement.total_amount)}</p></div>
        </div>
        {loan && (
          <div className="bg-[#C2FFDC] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2"><span className="text-sm text-slate-600">Payment Progress</span><span className="text-sm font-medium text-slate-800">{formatMoney(loan.amount_paid || 0)} / {formatMoney(agreement.total_amount)}</span></div>
            <div className="w-full bg-white rounded-full h-2"><div className="bg-[#00A86B] h-2 rounded-full transition-all" style={{ width: `${Math.min(100, ((loan.amount_paid || 0) / agreement.total_amount) * 100)}%` }} /></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400" /><div><p className="text-slate-500">Interest Rate</p><p className="font-semibold text-slate-800">{agreement.interest_rate}%</p></div></div>
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400" /><div><p className="text-slate-500">Payment Amount</p><p className="font-semibold text-slate-800">{formatMoney(agreement.payment_amount)}</p></div></div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /><div><p className="text-slate-500">Payment Frequency</p><p className="font-semibold text-slate-800 capitalize">{agreement.payment_frequency}</p></div></div>
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /><div><p className="text-slate-500">Due Date</p><p className="font-semibold text-slate-800">{agreement.due_date ? format(new Date(agreement.due_date), 'MMM d, yyyy') : 'N/A'}</p></div></div>
          </div>
        </div>
        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-semibold text-slate-800 mb-3">Parties</h4>
          <div className="grid grid-cols-2 gap-4">
            {[{ label: 'Lender', info: lenderInfo }, { label: 'Borrower', info: borrowerInfo }].map(({ label, info }) => (
              <div key={label} className="flex items-center gap-3">
                <img src={info.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((info.full_name || 'U').charAt(0))}&background=678AFB&color=fff&size=64`} alt={info.full_name} className="w-10 h-10 rounded-full" />
                <div><p className="text-xs text-slate-500">{label}</p><p className="font-medium text-slate-800">{info.full_name}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- Reusable Summary Tab Renderer ---
  const renderSummaryTab = (type) => {
    const isLending = type === 'lending';
    const activeLoans = isLending ? activeLendingLoans : activeBorrowingLoans;
    const nextPaymentLoan = isLending ? nextPaymentLoanLending : nextPaymentLoanBorrowing;
    const nextPaymentDays = isLending ? nextPaymentDaysLending : nextPaymentDaysBorrowing;
    const nextPaymentAmount = isLending ? nextPaymentAmountLending : nextPaymentAmountBorrowing;
    const otherPartyUsername = isLending ? nextPaymentBorrowerUsername : nextPaymentLenderUsername;
    const rankingFilter = isLending ? rankingFilterLending : rankingFilterBorrowing;
    const setRankingFilter = isLending ? setRankingFilterLending : setRankingFilterBorrowing;
    const accentColor = isLending ? '#54A6CF' : '#7EC0EA';
    const accentLight = isLending ? 'rgba(84,166,207,0.10)' : 'rgba(126,192,234,0.10)';
    const accentMid = isLending ? 'rgba(84,166,207,0.18)' : 'rgba(126,192,234,0.18)';

    return (
      <>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="borrowing-grid">
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Loan Progress */}
            <PageCard title="Loan Progress">
              <div style={{ padding: '10px 14px 14px' }}>
                {activeLoans.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#787776' }}>No active loans to track</p>
                ) : (
                  (() => {
                    const totalAll = activeLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
                    const paidAll = activeLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);
                    const pctAll = totalAll > 0 ? Math.round((paidAll / totalAll) * 100) : 0;
                    return (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 6, background: '#F0F0EE', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 999, width: `${Math.max(pctAll, 2)}%`, background: accentColor, transition: 'width 0.5s' }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1918', minWidth: 32, textAlign: 'right' }}>{pctAll}%</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#787776', margin: '6px 0 0' }}>{formatMoney(paidAll)} of {formatMoney(totalAll)} {isLending ? 'repaid' : 'paid back'}</p>
                      </div>
                    );
                  })()
                )}
              </div>
            </PageCard>

            {/* Your Active Loans */}
            {activeLoans.length > 0 && (
              <PageCard title="Your Active Loans">
                <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {activeLoans.slice(0, 5).map(loan => {
                    const otherParty = publicProfiles.find(p => p.user_id === (isLending ? loan.borrower_id : loan.lender_id));
                    const loanTotalOwed = loan.total_amount || loan.amount || 0;
                    const amountPaid = loan.amount_paid || 0;
                    const percentPaid = loanTotalOwed > 0 ? Math.round((amountPaid / loanTotalOwed) * 100) : 0;
                    return (
                      <div key={loan.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: accentColor }}>{otherParty?.full_name?.charAt(0) || '?'}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{otherParty?.full_name || 'User'}</span>
                          <span style={{ fontSize: 11, color: '#9B9A98' }}>· {loan.purpose || 'Loan'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 6, background: '#F0F0EE', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 999, width: `${Math.max(percentPaid, 2)}%`, background: accentColor, transition: 'width 0.5s' }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1918', minWidth: 32, textAlign: 'right' }}>{percentPaid}%</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#787776', margin: '5px 0 0' }}>{formatMoney(amountPaid)} of {formatMoney(loanTotalOwed)} {isLending ? 'repaid' : 'paid back'}</p>
                      </div>
                    );
                  })}
                </div>
              </PageCard>
            )}

            {/* Loans Ranked By — borrowing left column */}
            {!isLending && activeLoans.length > 0 && (
              <PageCard title="Loans Ranked By" headerRight={
                <Select value={rankingFilter} onValueChange={setRankingFilter}>
                  <SelectTrigger className="w-auto h-7 px-2 border-0 text-xs font-medium rounded-lg" style={{ background: accentLight, color: accentColor }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highest_interest">Highest Interest</SelectItem>
                    <SelectItem value="highest_payment">Highest Payment</SelectItem>
                    <SelectItem value="soonest_deadline">Soonest Deadline</SelectItem>
                  </SelectContent>
                  </Select>
                }>
                <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(() => {
                    const sorted = [...activeLoans].sort((a, b) => {
                      if (rankingFilter === 'highest_interest') return (b.interest_rate || 0) - (a.interest_rate || 0);
                      if (rankingFilter === 'highest_payment') return (b.payment_amount || 0) - (a.payment_amount || 0);
                      if (rankingFilter === 'soonest_deadline') { const dateA = a.next_payment_date ? new Date(a.next_payment_date) : new Date('2099-01-01'); const dateB = b.next_payment_date ? new Date(b.next_payment_date) : new Date('2099-01-01'); return dateA - dateB; }
                      return 0;
                    });
                    return sorted.slice(0, 5).map((loan, idx) => {
                      const otherParty = publicProfiles.find(p => p.user_id === loan.lender_id);
                      const rankValue = rankingFilter === 'highest_interest' ? `${loan.interest_rate || 0}%` : rankingFilter === 'highest_payment' ? `$${(loan.payment_amount || 0).toLocaleString()}` : loan.next_payment_date ? format(new Date(loan.next_payment_date), 'MMM d') : 'N/A';
                      return (
                        <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                          <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>{idx + 1}</span></div>
                          <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 11, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{otherParty?.full_name || 'User'} · {loan.purpose || 'Loan'}</p></div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1918', flexShrink: 0 }}>{rankValue}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </PageCard>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* LENDING: next payment incoming → upcoming payments */}
            {/* BORROWING: next payment due → loans ranked by */}

            {/* Next payment due — borrowing only (split into two side-by-side cards) */}
            {!isLending && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Card 1: Date + days badge */}
                  <PageCard title="Next Payment Due" highlight style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '10px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                      {nextPaymentLoan ? (
                        <>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {format(new Date(nextPaymentLoan.next_payment_date), 'MMM d')}
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: nextPaymentDays < 0 ? '#E8726E' : accentColor, background: nextPaymentDays < 0 ? 'rgba(232,114,110,0.1)' : accentLight, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                            {nextPaymentDays < 0 ? `${Math.abs(nextPaymentDays)}d late` : nextPaymentDays === 0 ? 'today' : `${nextPaymentDays}d`}
                          </span>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: '#787776' }}>No upcoming</div>
                      )}
                    </div>
                  </PageCard>
                  {/* Card 2: Amount + to/from name */}
                  <PageCard title="Next Payment Amount" highlight style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '10px 14px 14px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      {nextPaymentLoan ? (
                        <>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {formatMoney(nextPaymentAmount)}
                          </div>
                          <div style={{ fontSize: 11, color: '#787776' }}>to {otherPartyUsername}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: '#787776' }}>N/A</div>
                      )}
                    </div>
                  </PageCard>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Link to={createPageUrl("RecordPayment")} style={{ display: 'inline-flex', alignItems: 'center', background: '#1A1918', borderRadius: 9, padding: '7px 12px', textDecoration: 'none' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'white', margin: 0 }}>Record Payment</p>
                  </Link>
                </div>
              </>
            )}

            {/* Next payment incoming — lending only (split into two side-by-side cards) */}
            {isLending && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Card 1: Date + days badge */}
                  <PageCard title="Next Payment Incoming" highlight style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '10px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                      {nextPaymentLoan ? (
                        <>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {format(new Date(nextPaymentLoan.next_payment_date), 'MMM d')}
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: nextPaymentDays < 0 ? '#E8726E' : accentColor, background: nextPaymentDays < 0 ? 'rgba(232,114,110,0.1)' : accentLight, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                            {nextPaymentDays < 0 ? `${Math.abs(nextPaymentDays)}d late` : nextPaymentDays === 0 ? 'today' : `${nextPaymentDays}d`}
                          </span>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: '#787776' }}>No incoming</div>
                      )}
                    </div>
                  </PageCard>
                  {/* Card 2: Amount + from name */}
                  <PageCard title="Next Payment Amount" highlight style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '10px 14px 14px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      {nextPaymentLoan ? (
                        <>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {formatMoney(nextPaymentAmount)}
                          </div>
                          <div style={{ fontSize: 11, color: '#787776' }}>from {otherPartyUsername}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: '#787776' }}>N/A</div>
                      )}
                    </div>
                  </PageCard>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Link to={createPageUrl("RecordPayment")} style={{ display: 'inline-flex', alignItems: 'center', background: '#1A1918', borderRadius: 9, padding: '7px 12px', textDecoration: 'none' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'white', margin: 0 }}>Record Payment</p>
                  </Link>
                </div>
              </>
            )}

            {/* Upcoming Payments — lending tab right column */}
            {isLending && (() => {
              const allPaymentLoans = activeLendingLoans
                .filter(l => l.next_payment_date)
                .map(l => {
                  const otherParty = publicProfiles.find(p => p.user_id === l.borrower_id);
                  const days = daysUntilDate(l.next_payment_date);
                  const payDate = toLocalDate(l.next_payment_date);
                  const firstName = otherParty?.full_name?.split(' ')[0] || otherParty?.username || 'User';
                  return { ...l, firstName, days, payDate };
                })
                .sort((a, b) => a.payDate - b.payDate);
              const overdueLoans = allPaymentLoans.filter(l => l.days < 0);
              const upcomingLoans = allPaymentLoans.filter(l => l.days >= 0).slice(0, 5);
              const combinedLoans = [...overdueLoans, ...upcomingLoans];
              return (
                <PageCard title="Upcoming Payments">
                  <div style={{ padding: '10px 14px 14px' }}>
                    {combinedLoans.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', color: '#787776' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: 6 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <p style={{ fontSize: 12 }}>No upcoming payments</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {combinedLoans.map((loan, idx) => {
                          const isOverdue = loan.days < 0;
                          const purpose = loan.purpose || 'loan';
                          const daysLabel = isOverdue ? `${Math.abs(loan.days)}d late` : loan.days === 0 ? 'today' : `${loan.days}d`;
                          return (
                            <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                              {/* Days label */}
                              <div style={{ fontSize: 10, fontWeight: 600, color: isOverdue ? '#E8726E' : '#787776', letterSpacing: '0.02em', flexShrink: 0, minWidth: 46, textAlign: 'center' }}>
                                {daysLabel}
                              </div>
                              {/* Main info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
                                  {loan.firstName} pays you for {purpose}
                                </div>
                                <div style={{ fontSize: 11, color: '#787776', marginTop: 2 }}>
                                  due {format(loan.payDate, 'do MMM')}
                                </div>
                              </div>
                              {/* Amount */}
                              <div style={{ fontSize: 14, fontWeight: 600, flexShrink: 0, color: '#1A1918' }}>
                                +{formatMoney(loan.payment_amount || 0)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </PageCard>
              );
            })()}

            {/* Upcoming Payments — borrowing right column */}
            {!isLending && (() => {
              const allPaymentLoans = activeBorrowingLoans
                .filter(l => l.next_payment_date)
                .map(l => {
                  const otherParty = publicProfiles.find(p => p.user_id === l.lender_id);
                  const days = daysUntilDate(l.next_payment_date);
                  const payDate = toLocalDate(l.next_payment_date);
                  const firstName = otherParty?.full_name?.split(' ')[0] || otherParty?.username || 'User';
                  return { ...l, firstName, days, payDate };
                })
                .sort((a, b) => a.payDate - b.payDate);
              const overdueLoans = allPaymentLoans.filter(l => l.days < 0);
              const upcomingLoans = allPaymentLoans.filter(l => l.days >= 0).slice(0, 5);
              const combinedLoans = [...overdueLoans, ...upcomingLoans];
              return (
                <PageCard title="Upcoming Payments">
                  <div style={{ padding: '10px 14px 14px' }}>
                    {combinedLoans.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', color: '#787776' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: 6 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <p style={{ fontSize: 12 }}>No upcoming payments</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {combinedLoans.map((loan, idx) => {
                          const isOverdue = loan.days < 0;
                          const purpose = loan.purpose || 'loan';
                          const daysLabel = isOverdue ? `${Math.abs(loan.days)}d late` : loan.days === 0 ? 'today' : `${loan.days}d`;
                          return (
                            <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                              {/* Days label */}
                              <div style={{ fontSize: 10, fontWeight: 600, color: isOverdue ? '#E8726E' : '#787776', letterSpacing: '0.02em', flexShrink: 0, minWidth: 46, textAlign: 'center' }}>
                                {daysLabel}
                              </div>
                              {/* Main info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
                                  Pay {loan.firstName} for {purpose}
                                </div>
                                <div style={{ fontSize: 11, color: '#787776', marginTop: 2 }}>
                                  due {format(loan.payDate, 'do MMM')}
                                </div>
                              </div>
                              {/* Amount */}
                              <div style={{ fontSize: 14, fontWeight: 600, flexShrink: 0, color: '#1A1918' }}>
                                -{formatMoney(loan.payment_amount || 0)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </PageCard>
              );
            })()}
          </div>
        </div>
      </>
    );
  };

  // --- Individual Loan Details Tab ---
  const renderDetailsTab = () => {
    if (allManageableLoans.length === 0) {
      return (
        <PageCard title="Loan Details" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <div style={{ textAlign: 'center', padding: 26 }}><ClipboardList style={{ width: 40, height: 40, margin: '0 auto 8px', color: '#C7C6C4' }} /><p style={{ fontSize: 13, color: '#787776' }}>No loans to display</p></div>
        </PageCard>
      );
    }

    let chartData = [];
    let plannedPaymentAmount = 0;
    let recalculatedPayment = 0;
    let loanAnalysis = null;
    if (manageLoanSelected) {
      const agreement = loanAgreements.find(a => a.loan_id === manageLoanSelected.id);
      plannedPaymentAmount = manageLoanSelected.payment_amount || 0;
      loanAnalysis = analyzeLoanPayments(manageLoanSelected, allPayments, agreement);
      recalculatedPayment = loanAnalysis ? loanAnalysis.recalcPayment : 0;
      if (loanAnalysis) {
        loanAnalysis.periodResults.forEach((pr, i) => {
          const scheduledAmt = pr.scheduledAmount || (recalculatedPayment > 0 ? recalculatedPayment : plannedPaymentAmount);
          if (pr.hasAnyPayments) {
            chartData.push({ label: `P${i + 1}`, amount: pr.actualPaid, scheduledAmount: scheduledAmt, confirmedAmount: pr.confirmedPaid, pendingAmount: pr.pendingPaid, isPaid: true, isProjected: false, isFullPayment: pr.isFullPayment, isInProgress: !pr.isPast && pr.hasAnyPayments, hasPendingOnly: !pr.hasConfirmedPayments && pr.hasPendingPayments });
          } else if (pr.isPast) {
            chartData.push({ label: `P${i + 1}`, amount: 0, scheduledAmount: scheduledAmt, isPaid: false, isProjected: false, isMissed: true });
          } else {
            chartData.push({ label: `P${i + 1}`, amount: scheduledAmt, scheduledAmount: scheduledAmt, isPaid: false, isProjected: true });
          }
        });
      }
    }
    const chartHeight = 110;
    const maxChartVal = Math.max(plannedPaymentAmount, ...chartData.map(d => d.amount), 1);

    // Determine perspective for selected loan
    const isLending = isLendingLoan;
    const otherPartyId = manageLoanSelected ? (isLending ? manageLoanSelected.borrower_id : manageLoanSelected.lender_id) : null;
    const otherPartyProfile = otherPartyId ? publicProfiles.find(p => p.user_id === otherPartyId) : null;
    const otherPartyUsername = otherPartyProfile?.full_name || 'User';

    return (
      <div>
        {/* Select a Loan */}
        <PageCard title="Select a Loan to Learn More" style={{ marginBottom: 16 }}>
          <div style={{ padding: '10px 14px 14px' }}>
            <div style={{ position: 'relative' }}>
              <select value={manageLoanSelected?.id || ''} onChange={(e) => { const selected = allManageableLoans.find(l => l.id === e.target.value); if (selected) setManageLoanSelected(selected); }} style={{ width: '100%', appearance: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#1A1918', background: 'rgba(84,166,207,0.08)', cursor: 'pointer', border: '1px solid rgba(84,166,207,0.2)', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                {allManageableLoans.map((loan) => {
                  const isLend = loan.lender_id === user?.id;
                  const otherParty = publicProfiles.find(p => p.user_id === (isLend ? loan.borrower_id : loan.lender_id));
                  const roleLabel = isLend ? 'Lent to' : 'Borrowed from';
                  return (<option key={loan.id} value={loan.id}>{roleLabel} {otherParty?.full_name || 'User'} · ${loan.amount?.toLocaleString()}{loan.status === 'cancelled' ? ' · Cancelled' : ''}</option>);
                })}
              </select>
              <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, bottom: 0, right: 10, display: 'flex', alignItems: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#54A6CF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div>
            </div>
          </div>
        </PageCard>


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
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12 }}>
                  {/* Payment Progress circle card */}
                  <PageCard title="Payment Progress" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                      <circle cx={dCx} cy={dCy} r={(outerR + innerR) / 2} fill="none" stroke="#E5E4E2" strokeWidth={outerR - innerR} />
                      {paidPct > 0 && paidPct < 100 && (<path d={`M ${dCx} ${dCy - outerR} A ${outerR} ${outerR} 0 ${largeArc} 1 ${paidEndXo} ${paidEndYo} L ${paidEndXi} ${paidEndYi} A ${innerR} ${innerR} 0 ${largeArc} 0 ${dCx} ${dCy - innerR} Z`} fill="#82F0B9" />)}
                      {paidPct >= 100 && (<circle cx={dCx} cy={dCy} r={(outerR + innerR) / 2} fill="none" stroke="#82F0B9" strokeWidth={outerR - innerR} />)}
                      <text x={dCx} y={dCy - 5} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 15, fontWeight: 700, fill: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{Math.round(paidPct)}%</text>
                      <text x={dCx} y={dCy + 10} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 8, fontWeight: 500, fill: '#787776', fontFamily: "'DM Sans', sans-serif" }}>repaid</text>
                    </svg>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', marginTop: 6, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      ${totalPaidAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span style={{ color: '#787776', fontWeight: 400 }}> / ${totalOwedNow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </p>
                    </div>
                  </PageCard>
                  {/* Stacked: next payment date + amount */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Next payment date card */}
                    <PageCard title={isLending ? 'Next Payment Incoming' : 'Next Payment Due'} highlight style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                        {nextPmtDate ? (
                          <>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', lineHeight: 1 }}>
                              {format(nextPmtDate, 'MMM d')}
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: daysUntil < 0 ? '#E8726E' : '#54A6CF', background: daysUntil < 0 ? 'rgba(232,114,110,0.1)' : 'rgba(84,166,207,0.08)', borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                              {daysUntil < 0 ? `${Math.abs(daysUntil)}d late` : daysUntil === 0 ? 'today' : `${daysUntil}d`}
                            </span>
                          </>
                        ) : (
                          <div style={{ fontSize: 13, color: '#787776' }}>N/A</div>
                        )}
                      </div>
                    </PageCard>
                    {/* Next payment amount card */}
                    <PageCard title="Next Payment Amount" highlight style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        {nextPmtDate ? (
                          <>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', lineHeight: 1 }}>
                              {formatMoney(nextPmtAmt)}
                            </div>
                            <div style={{ fontSize: 11, color: '#787776' }}>
                              {isLending ? `from ${otherPartyUsername}` : `to ${otherPartyUsername}`}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 13, color: '#787776' }}>N/A</div>
                        )}
                      </div>
                    </PageCard>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Link to={createPageUrl("RecordPayment")} style={{ display: 'inline-flex', alignItems: 'center', background: '#1A1918', borderRadius: 9, padding: '7px 12px', textDecoration: 'none' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'white', margin: 0 }}>Record Payment</p>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Payment History Chart */}
            <PageCard title="Payment History">
              <div style={{ padding: '10px 14px 14px' }}>
              {!manageLoanSelected ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: chartHeight }}><p style={{ fontSize: 12, color: '#C7C6C4' }}>Select a loan to view chart</p></div>
              ) : chartData.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: chartHeight }}><p style={{ fontSize: 12, color: '#C7C6C4' }}>No payment schedule</p></div>
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
                        <div style={{ position: 'absolute', left: 0, right: 0, borderTop: '2px dashed rgba(84,166,207,0.4)', zIndex: 10, bottom: `${(plannedPaymentAmount / maxChartVal) * 100}%` }}>
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
                                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', borderRadius: '4px 4px 0 0', background: 'rgba(3,172,234,0.08)', border: '1px dashed rgba(3,172,234,0.2)' }} />
                                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: Math.max(barHeight, 4), borderRadius: '4px 4px 0 0', background: '#03ACEA' }} />
                                </div>
                              ) : (
                                <div style={{
                                  borderRadius: '4px 4px 0 0', transition: 'all 0.3s',
                                  height: Math.max(barHeight, d.amount > 0 ? 4 : 2), width: 14,
                                  background: d.isProjected ? 'rgba(176,220,244,0.35)' : d.isMissed ? 'rgba(232,114,110,0.3)' : d.amount === 0 ? '#E5E4E2' : isPendingOnly ? 'rgba(0,0,0,0.1)' : isFullPmt ? '#03ACEA' : isPartialPmt ? 'rgba(245,158,11,0.6)' : 'rgba(3,172,234,0.25)',
                                  border: d.isProjected ? '1px dashed #B0DCF4' : d.isMissed ? '1px dashed rgba(232,114,110,0.5)' : isPendingOnly ? '1px dashed rgba(0,0,0,0.15)' : 'none',
                                }} title={`${d.label}: $${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}${d.isProjected ? ' (expected)' : d.isMissed ? ' (missed)' : isPendingOnly ? ' (pending)' : isPartialPmt ? ' (partial)' : ''}`} />
                              )}
                            </div>
                            <p style={{ fontSize: 10, marginTop: 4, lineHeight: 1, margin: 0, color: isInProgress ? '#03ACEA' : d.isProjected ? '#B0DCF4' : d.isMissed ? '#E8726E' : isPendingOnly ? '#9B9A98' : '#787776' }}>{d.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#03ACEA' }} /><span style={{ fontSize: 9, color: '#787776' }}>Completed</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0,0,0,0.1)', border: '1px dashed rgba(0,0,0,0.15)' }} /><span style={{ fontSize: 9, color: '#9B9A98' }}>Pending</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(176,220,244,0.35)', border: '1px dashed #B0DCF4' }} /><span style={{ fontSize: 9, color: '#B0DCF4' }}>Expected</span></div>
                  </div>
                </div>
              )}
              </div>
            </PageCard>

            {/* Record Payment */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 4px' }}>
              <Link to={createPageUrl("RecordPayment")} style={{ display: 'inline-flex', alignItems: 'center', background: '#1A1918', borderRadius: 9, padding: '7px 12px', textDecoration: 'none' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'white', margin: 0 }}>Record Payment</p>
              </Link>
            </div>

            {/* Activity Timeline */}
            {manageLoanSelected && (
            <PageCard title="Activity">
              <div style={{ padding: '10px 14px 14px' }}>
              {(() => {
                const ag = loanAgreements.find(a => a.loan_id === manageLoanSelected.id);
                const loanPmts = allPayments.filter(p => p.loan_id === manageLoanSelected.id);
                const lenderProfile = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                const borrowerProfile = publicProfiles.find(p => p.user_id === manageLoanSelected.borrower_id);
                const lenderName = lenderProfile?.full_name || 'lender';
                const borrowerName = borrowerProfile?.full_name || 'borrower';
                const activities = [];
                if (manageLoanSelected.created_at) activities.push({ timestamp: new Date(manageLoanSelected.created_at), type: 'created', description: `Loan created between ${borrowerName} and ${lenderName}` });
                if (ag?.borrower_signed_date) activities.push({ timestamp: new Date(ag.borrower_signed_date), type: 'signature', description: `${borrowerName} signed the loan agreement` });
                if (ag?.lender_signed_date) activities.push({ timestamp: new Date(ag.lender_signed_date), type: 'signature', description: `${lenderName} signed the loan agreement` });
                loanPmts.forEach(payment => {
                  const isConfirmed = payment.status === 'completed' || payment.status === 'confirmed';
                  const isRecordedByUser = payment.recorded_by === user?.id;
                  const pmtAmount = `$${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  let desc;
                  if (isLending) {
                    if (isRecordedByUser) desc = `You ${isConfirmed ? 'confirmed' : 'recorded'} a ${pmtAmount} payment from ${borrowerName}`;
                    else desc = `${borrowerName} ${isConfirmed ? 'made' : 'recorded'} a ${pmtAmount} payment`;
                  } else {
                    if (isRecordedByUser) desc = `You ${isConfirmed ? 'made' : 'recorded'} a ${pmtAmount} payment to ${lenderName}`;
                    else desc = `${lenderName} recorded a ${pmtAmount} payment from ${borrowerName}`;
                  }
                  activities.push({ timestamp: new Date(payment.payment_date || payment.created_at), type: 'payment', description: desc, isAwaitingConfirmation: !isConfirmed });
                });
                if (ag?.cancelled_date) activities.push({ timestamp: new Date(ag.cancelled_date), type: 'cancellation', description: 'Loan was cancelled' });
                if (manageLoanSelected.status === 'completed') activities.push({ timestamp: new Date(), type: 'completion', description: 'Loan repaid in full' });
                activities.sort((a, b) => a.timestamp - b.timestamp);
                const activityIconConfig = {
                  created:      { bg: 'rgba(3,172,234,0.12)',   stroke: '#03ACEA',  path: 'M12 4v16m8-8H4' },
                  signature:    { bg: 'rgba(124,58,237,0.12)',  stroke: '#7C3AED',  path: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
                  payment:      { bg: 'rgba(22,163,74,0.12)',   stroke: '#16A34A',  path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1' },
                  cancellation: { bg: 'rgba(232,114,110,0.12)', stroke: '#E8726E',  path: 'M6 18L18 6M6 6l12 12' },
                  completion:   { bg: 'rgba(22,163,74,0.12)',   stroke: '#16A34A',  path: 'M5 13l4 4L19 7' },
                };
                const getIcon = (type) => {
                  const cfg = activityIconConfig[type] || activityIconConfig.created;
                  return <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={cfg.stroke} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={cfg.path} /></svg>;
                };
                const getDotStyle = (type) => {
                  const cfg = activityIconConfig[type] || activityIconConfig.created;
                  return { width: 23, height: 23, borderRadius: 6, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 10, marginTop: 2 };
                };
                if (activities.length === 0) return <p style={{ fontSize: 11, color: '#C7C6C4' }}>No activity recorded yet.</p>;
                return (
                  <div className="space-y-0 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {activities.map((activity, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 relative">
                        {idx < activities.length - 1 && <div className="absolute left-[11px] top-[22px] w-[1px]" style={{ height: 'calc(100% - 6px)', background: 'rgba(84,166,207,0.2)' }} />}
                        <div style={getDotStyle(activity.type)}>{getIcon(activity.type)}</div>
                        <div className="flex-1 min-w-0 pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p style={{ fontSize: 11, color: '#1A1918', lineHeight: 1.4 }}>{activity.description}</p>
                            {activity.isAwaitingConfirmation && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 whitespace-nowrap">Awaiting Confirmation</span>}
                          </div>
                          <p style={{ fontSize: 9, color: '#C7C6C4', marginTop: 2 }}>{format(activity.timestamp, 'MMM d, yyyy · h:mm a')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              </div>
            </PageCard>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!manageLoanSelected ? (
              <PageCard title="Loan Details" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <div style={{ textAlign: 'center', padding: 26 }}><ClipboardList style={{ width: 40, height: 40, margin: '0 auto 8px', color: '#C7C6C4' }} /><p style={{ fontSize: 13, color: '#787776' }}>Select a loan to view details</p></div>
              </PageCard>
            ) : (
              <>
                {/* Loan Terms */}
                <PageCard title="Loan Terms">
                  <div style={{ padding: '10px 14px 14px' }}>
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
                        {items.map((item, idx) => (<div key={idx} style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p><p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p></div>))}
                      </div>
                    );
                  })()}
                  </div>
                </PageCard>

                {/* Document Buttons */}
                {(() => {
                  const btnBase = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1A1918', borderRadius: 9, padding: '7px 12px', border: 'none', cursor: 'pointer' };
                  const btnLabel = { fontSize: 11, fontWeight: 600, color: 'white', margin: 0 };
                  const infoBadge = { width: 15, height: 15, borderRadius: '50%', background: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
                  const tooltipStyle = { position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'white', borderRadius: 9, padding: '8px 11px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)', width: 190, zIndex: 200, border: '1px solid rgba(0,0,0,0.07)' };
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0', justifyContent: 'center' }}>
                      {/* Promissory Note */}
                      <div style={{ position: 'relative' }}>
                        <div style={btnBase}>
                          <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === manageLoanSelected.id); if (ag) openDocPopup('promissory', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <p style={btnLabel}>Promissory Note</p>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setInfoTooltip(infoTooltip === 'promissory' ? null : 'promissory'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                            <span style={infoBadge}><span style={{ fontSize: 9, fontWeight: 800, color: '#1A1918', lineHeight: 1 }}>i</span></span>
                          </button>
                        </div>
                        {infoTooltip === 'promissory' && (
                          <div style={tooltipStyle}>
                            <p style={{ fontSize: 11, color: '#1A1918', margin: 0, lineHeight: 1.55 }}>A signed legal document where the borrower promises to repay a specific amount under agreed terms.</p>
                          </div>
                        )}
                      </div>
                      {/* Amortization Schedule */}
                      <div style={{ position: 'relative' }}>
                        <div style={btnBase}>
                          <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === manageLoanSelected.id); if (ag) openDocPopup('amortization', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <p style={btnLabel}>Amortization Schedule</p>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setInfoTooltip(infoTooltip === 'amortization' ? null : 'amortization'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                            <span style={infoBadge}><span style={{ fontSize: 9, fontWeight: 800, color: '#1A1918', lineHeight: 1 }}>i</span></span>
                          </button>
                        </div>
                        {infoTooltip === 'amortization' && (
                          <div style={tooltipStyle}>
                            <p style={{ fontSize: 11, color: '#1A1918', margin: 0, lineHeight: 1.55 }}>A table showing each scheduled payment broken down into principal and interest over the life of the loan.</p>
                          </div>
                        )}
                      </div>
                      {/* Loan Summary */}
                      <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === manageLoanSelected.id); if (ag) openDocPopup('summary', ag); }} style={{ ...btnBase }}>
                        <p style={btnLabel}>Loan Summary</p>
                      </button>
                    </div>
                  );
                })()}

                {/* Loan Progress Stats */}
                <PageCard title="Loan Progress">
                  <div style={{ padding: '10px 14px 14px' }}>
                  {(() => {
                    const repaymentPeriod = manageLoanSelected.repayment_period || 0;
                    const paymentFrequency = manageLoanSelected.payment_frequency || 'monthly';
                    const totalOwedDisplay = loanAnalysis ? loanAnalysis.totalOwedNow : (manageLoanSelected.total_amount || manageLoanSelected.amount || 0);
                    const amountPaidDisplay = loanAnalysis ? loanAnalysis.totalPaid : (manageLoanSelected.amount_paid || 0);
                    const fullPayments = loanAnalysis ? loanAnalysis.fullPaymentCount : 0;
                    const paymentAmountDisplay = loanAnalysis ? loanAnalysis.nextPaymentAmount : (recalculatedPayment > 0 ? recalculatedPayment : (manageLoanSelected.payment_amount || 0));
                    const freqLabel = paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1);
                    const items = [
                      { label: isLending ? 'Total Owed to You' : 'Total Owed', value: `$${totalOwedDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'with interest' },
                      { label: isLending ? 'Amount Received' : 'Amount Paid', value: `$${amountPaidDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: null },
                      { label: 'Payments Made', value: `${fullPayments}/${repaymentPeriod}`, sub: 'full payments' },
                      { label: `${freqLabel} Payments`, value: `$${paymentAmountDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: isLending ? `from ${otherPartyUsername}` : `to ${otherPartyUsername}` },
                    ];
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {items.map((item, idx) => (<div key={idx} style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p><p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p>{item.sub && <p style={{ fontSize: 9, color: '#787776', marginTop: 2 }}>{item.sub}</p>}</div>))}
                      </div>
                    );
                  })()}
                  </div>
                </PageCard>

                {/* Payments */}
                <PageCard title="Payments">
                  <div style={{ padding: '10px 14px 14px' }}>
                  {(() => {
                    const paymentAmt = manageLoanSelected.payment_amount || 0;
                    const paymentRows = loanAnalysis ? loanAnalysis.periodResults.map((pr) => {
                      let status;
                      if (pr.hasConfirmedPayments && pr.isFullPayment) status = 'completed';
                      else if (pr.hasAnyPayments && !pr.isPast) status = 'partial';
                      else if (pr.hasConfirmedPayments && !pr.isFullPayment) status = 'partial';
                      else if (pr.hasPendingPayments && !pr.hasConfirmedPayments) status = 'pending';
                      else if (pr.isPast && !pr.hasAnyPayments) status = 'missed';
                      else status = 'upcoming';
                      const expectedAmount = pr.scheduledAmount || (loanAnalysis.recalcPayment > 0 ? loanAnalysis.recalcPayment : paymentAmt);
                      const paidAmount = pr.actualPaid || 0;
                      const paidPercentage = status === 'completed' ? 100 : (status === 'partial' && expectedAmount > 0) ? Math.min(99, (paidAmount / expectedAmount) * 100) : 0;
                      return { number: pr.period, date: pr.date, amount: expectedAmount, paidAmount, paidPercentage, status };
                    }) : [];
                    const statusConfig = {
                      completed:   { label: 'Completed',   bg: 'rgba(3,172,234,0.1)',   text: '#03ACEA', ringColor: '#03ACEA', fillColor: '#03ACEA' },
                      partial:     { label: 'Partial',     bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', ringColor: '#F59E0B', fillColor: '#F59E0B' },
                      pending:     { label: 'Pending',     bg: 'rgba(0,0,0,0.05)',     text: '#9B9A98', ringColor: 'rgba(0,0,0,0.15)', fillColor: 'rgba(0,0,0,0.1)' },
                      missed:      { label: 'Missed',         bg: 'rgba(232,114,110,0.1)', text: '#E8726E', ringColor: '#E8726E', fillColor: '#E8726E' },
                      upcoming:    { label: 'Upcoming',       bg: 'rgba(0,0,0,0.03)',      text: '#787776', ringColor: 'rgba(0,0,0,0.12)', fillColor: 'rgba(0,0,0,0.08)' },
                    };
                    const PieCircle = ({ percentage, ringColor, fillColor, number, size = 32 }) => {
                      const r = (size / 2) - 2; const pcx = size / 2; const pcy = size / 2;
                      const circumference = 2 * Math.PI * r; const filled = (percentage / 100) * circumference;
                      return (
                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
                          <circle cx={pcx} cy={pcy} r={r} fill="#F7F7F7" stroke={ringColor} strokeWidth="2" strokeOpacity="0.3" />
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
                                <p style={{ fontSize: 11, color: '#787776', margin: 0, fontWeight: 500 }}>Expected: ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                {row.paidAmount > 0 && <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', margin: '1px 0 0' }}>Paid: ${row.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
                                <p style={{ fontSize: 10, color: '#C7C6C4', margin: '1px 0 0' }}>{format(row.date, 'MMM d, yyyy')}</p>
                              </div>
                              <span style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  </div>
                </PageCard>

                {manageLoanSelected.status === 'cancelled' && (
                  <div className="bg-red-50 rounded-xl px-4 py-3 shadow-sm border border-red-200"><p className="text-sm text-red-600 font-medium">This loan has been cancelled.</p></div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';

  const PageCard = ({ title, headerRight, children, style, highlight }) => (
    <div style={{ background: highlight ? '#03ACEA' : '#F4F4F5', borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW, ...style }}>
      <div style={{ padding: '6px 14px 5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: highlight ? 'rgba(255,255,255,0.85)' : '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
      <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 10, overflow: 'hidden', ...(highlight ? { flex: 1 } : {}) }}>
        {children}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 14, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading your loans...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Document Popup Modal */}
      <AnimatePresence>
        {activeDocPopup && docPopupAgreement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeDocPopup}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(130,240,185,0.1)' }}><FileText className="w-4 h-4" style={{ color: '#82F0B9' }} /></div>
                  <span className="font-medium text-slate-800">
                    {activeDocPopup === 'promissory' && 'Promissory Note'}
                    {activeDocPopup === 'amortization' && 'Amortization Schedule'}
                    {activeDocPopup === 'summary' && 'Loan Summary'}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={closeDocPopup} className="text-slate-500 hover:text-slate-800"><X className="w-5 h-5" /></Button>
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

      <div className="home-with-sidebar" style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingTop: 0, background: 'transparent' }}>
        <DashboardSidebar activePage="YourLoans" user={user} />

          {/* Hero */}
          <div style={{ margin: '8px 10px 0', height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 106, position: 'relative' }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 1200 168" preserveAspectRatio="xMidYMid slice">
              {[{cx:80,cy:40},{cx:200,cy:110},{cx:320,cy:25},{cx:430,cy:160},{cx:540,cy:70},{cx:660,cy:130},{cx:770,cy:35},{cx:890,cy:175},{cx:1000,cy:80},{cx:1100,cy:140},{cx:150,cy:185},{cx:480,cy:100},{cx:720,cy:180},{cx:950,cy:55},{cx:280,cy:195},{cx:620,cy:48},{cx:1050,cy:195}].map((s, i) => (
                <circle key={i} cx={s.cx} cy={s.cy} r={i % 3 === 0 ? 2.5 : 1.5} fill="white" />
              ))}
            </svg>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 40, fontWeight: 600, color: '#1A1918', margin: 0, letterSpacing: '-0.01em', lineHeight: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <span style={{ fontStyle: 'normal' }}>My Loans</span>
            </h1>
            <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: 3, marginTop: 16, position: 'relative', zIndex: 1 }}>
              {[{key:'lending',label:'Lending'},{key:'borrowing',label:'Borrowing'},{key:'details',label:'Loan Details'}].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  fontWeight: activeTab === tab.key ? 600 : 500,
                  color: activeTab === tab.key ? '#1A1918' : 'rgba(0,0,0,0.45)',
                  background: activeTab === tab.key ? 'white' : 'transparent',
                  boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>{tab.label}</button>
              ))}
            </div>
          </div>

            {/* Page content */}
            <div className="dashboard-content-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 40px 0', position: 'relative', zIndex: 1 }}>
              <div className="dashboard-grey-box" style={{ background: '#E5E2DF', borderRadius: 18, padding: 20 }}>
              {activeTab !== 'details' && (() => {
                const isLendingTab = activeTab === 'lending';
                const allOverdue = isLendingTab
                  ? activeLendingLoans.filter(l => l.next_payment_date && daysUntilDate(l.next_payment_date) < 0).map(l => ({ ...l, role: 'lending' }))
                  : activeBorrowingLoans.filter(l => l.next_payment_date && daysUntilDate(l.next_payment_date) < 0).map(l => ({ ...l, role: 'borrowing' }));
                if (allOverdue.length === 0) return null;
                const clampedSlide = reminderSlide % allOverdue.length;
                const carouselInner = (
                  <>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)', transform: `translateX(-${clampedSlide * 100}%)` }}>
                        {allOverdue.map((loan, idx) => {
                          const isLen = loan.role === 'lending';
                          const otherParty = getUserById(isLen ? loan.borrower_id : loan.lender_id);
                          const firstName = otherParty?.full_name?.split(' ')[0] || otherParty?.username || 'User';
                          const amt = formatMoney(loan.payment_amount || 0);
                          const accentCol = isLen ? '#54A6CF' : '#E8726E';
                          return (
                            <div key={`reminder-${loan.id}`} style={{ minWidth: '100%', padding: '16px 16px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(232,114,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Clock style={{ width: 16, height: 16, color: '#E8726E' }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', lineHeight: 1.5, margin: '0 0 2px' }}>
                                  {isLen ? (
                                    <><strong style={{ fontWeight: 600 }}>{firstName}</strong>{`'s payment to you is overdue.`}</>
                                  ) : (
                                    <>Your <strong style={{ fontWeight: 600 }}>{amt}</strong>{` payment to `}<strong style={{ fontWeight: 600 }}>{firstName}</strong>{` is overdue.`}</>
                                  )}
                                </p>
                                <p style={{ fontSize: 12, color: '#787776', lineHeight: 1.5, margin: 0 }}>
                                  {isLen
                                    ? `If they've already paid, make sure to record it so your dashboard stays up to date.`
                                    : `If you've already paid, make sure to record the payment so it's up to date.`}
                                </p>
                              </div>
                              <Link to={createPageUrl("RecordPayment")} style={{
                                display: 'inline-flex', padding: '7px 14px', borderRadius: 20,
                                background: accentCol, color: 'white',
                                fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
                                fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
                              }}>Record Payment</Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {allOverdue.length > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '4px 0 14px' }}>
                        {allOverdue.map((_, i) => (
                          <button key={i} onClick={() => setReminderSlide(i)} style={{
                            width: i === clampedSlide ? 16 : 6, height: 6,
                            borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0,
                            background: i === clampedSlide ? '#1A1918' : 'rgba(0,0,0,0.15)',
                            transition: 'all 0.25s',
                          }} />
                        ))}
                      </div>
                    )}
                  </>
                );
                if (isLendingTab) {
                  return (
                    <PageCard title="Overdue Payments" style={{ marginBottom: 20 }}>
                      {carouselInner}
                    </PageCard>
                  );
                }
                return <div style={{ background: '#F4F4F5', borderRadius: 14, marginBottom: 20, overflow: 'hidden' }}>{carouselInner}</div>;
              })()}

              {activeTab === 'lending' && renderSummaryTab('lending')}
              {activeTab === 'borrowing' && renderSummaryTab('borrowing')}
              {activeTab === 'details' && renderDetailsTab()}
            </div>

          <div className="dashboard-footer" style={{ padding: '12px 28px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
          <div className="dashboard-footer-links" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="https://www.vony-lending.com/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Terms of Service</a>
            <a href="https://www.vony-lending.com/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Privacy Center</a>
            <a href="https://www.vony-lending.com/do-not-sell" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Do not sell or share my personal information</a>
          </div>
          </div>
            </div>
      </div>

      {/* Modals */}
      {showDetailsModal && selectedLoanDetails && (
        <LoanDetailsModal loan={selectedLoanDetails.loan} type={selectedLoanDetails.type} isOpen={showDetailsModal} user={user} onCancel={() => handleCancelLoan(selectedLoanDetails.loan)} onClose={() => { setShowDetailsModal(false); setSelectedLoanDetails(null); }} />
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="rounded-2xl border-0 p-0 overflow-hidden" style={{ backgroundColor: '#F5F4F0' }}>
          <div className="p-6 pb-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1A1918' }}>Cancel Loan</AlertDialogTitle>
              <AlertDialogDescription className="text-sm mt-1" style={{ color: '#787776' }}>Are you sure you want to cancel this loan? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl border-0 font-semibold text-white text-[14px] h-12 hover:opacity-90 transition-all" style={{ backgroundColor: '#82F0B9' }}>Keep Loan</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelLoan} className="flex-1 rounded-xl border-0 font-semibold text-white text-[14px] h-12 hover:opacity-90 transition-all" style={{ backgroundColor: '#E8726E' }}>Request Loan Cancellation</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Loan Modal */}
      {showEditLoanModal && editLoanData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><Pencil className="w-5 h-5 text-amber-600" /></div>
                  <div><h2 className="text-xl font-bold text-slate-800">Edit Loan Contract</h2><p className="text-sm text-slate-500">Changes will be sent to borrower for approval</p></div>
                </div>
                <button onClick={() => { setShowEditLoanModal(false); setEditLoanData(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <div className="flex items-start gap-2"><AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" /><div className="text-sm text-amber-800"><p className="font-medium">Contract Modification Notice</p><p className="text-amber-700">All changes will be recorded in the loan history and the borrower will need to approve the new terms.</p></div></div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2"><Label htmlFor="edit-amount" className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-amber-600" />Loan Amount</Label><Input id="edit-amount" type="number" step="0.01" min="0" value={editLoanData.amount} onChange={(e) => setEditLoanData(prev => ({ ...prev, amount: e.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="edit-interest" className="flex items-center gap-2"><Percent className="w-4 h-4 text-amber-600" />Interest Rate (% per year)</Label><Input id="edit-interest" type="number" step="0.1" min="0" max="100" value={editLoanData.interest_rate} onChange={(e) => setEditLoanData(prev => ({ ...prev, interest_rate: e.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="edit-period" className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" />Repayment Period (months)</Label><Input id="edit-period" type="number" min="1" value={editLoanData.repayment_period} onChange={(e) => setEditLoanData(prev => ({ ...prev, repayment_period: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-600" />Payment Frequency</Label>
                  <Select value={editLoanData.payment_frequency} onValueChange={(value) => setEditLoanData(prev => ({ ...prev, payment_frequency: value }))}><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="biweekly">Bi-weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2"><Label htmlFor="edit-due-date" className="flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-600" />Due Date</Label><Input id="edit-due-date" type="date" value={editLoanData.due_date || ''} onChange={(e) => setEditLoanData(prev => ({ ...prev, due_date: e.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="edit-purpose" className="flex items-center gap-2"><FileText className="w-4 h-4 text-amber-600" />Purpose</Label><Input id="edit-purpose" type="text" value={editLoanData.purpose} onChange={(e) => setEditLoanData(prev => ({ ...prev, purpose: e.target.value }))} maxLength={100} /></div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes" className="flex items-center gap-2"><History className="w-4 h-4 text-amber-600" />Notes for Borrower (optional)</Label>
                  <textarea id="edit-notes" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" rows={3} placeholder="Explain why you're making these changes..." value={editLoanData.notes} onChange={(e) => setEditLoanData(prev => ({ ...prev, notes: e.target.value }))} maxLength={500} />
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
                <Button onClick={() => { setShowEditLoanModal(false); setEditLoanData(null); }} variant="outline" className="flex-1">Cancel</Button>
                <Button onClick={handleSaveEditLoan} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"><Save className="w-4 h-4 mr-2" />Save & Send to Borrower</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

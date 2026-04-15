import React, { useState, useEffect, useRef } from "react";
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
import { format, addDays, addMonths, addWeeks, startOfMonth, endOfMonth } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import LoanDetailsModal from "@/components/loans/LoanDetailsModal";
import SidebarBottomSection from '../components/SidebarBottomSection';
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";

export default function YourLoans() {
  const { logout } = useAuth();
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
  const [loanDropdownOpen, setLoanDropdownOpen] = useState(false);
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
    let carryover = 0; // Surplus from overpayments spills into subsequent periods
    const periodResults = [];
    for (let i = 0; i < effectivePeriods; i++) {
      const periodInterest = Math.round(remainingPrincipal * r * 100) / 100;
      totalInterestAccrued += periodInterest;
      const scheduledAmount = originalPaymentAmount; // Flat contracted amount per period
      // Actual cash received in this period's date range
      const confirmedInPeriod = periodConfirmedPayments[i].reduce((sum, p) => sum + (p.amount || 0), 0);
      const allInPeriod = periodAllPayments[i].reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingInPeriod = allInPeriod - confirmedInPeriod;
      totalPaid += confirmedInPeriod;
      // Effective coverage = carryover from prior overpayments + this period's confirmed cash
      const effectiveConfirmed = carryover + confirmedInPeriod;
      const allocatedConfirmed = Math.min(effectiveConfirmed, scheduledAmount);
      const isFullPayment = effectiveConfirmed >= scheduledAmount && scheduledAmount > 0;
      if (isFullPayment) fullPaymentCount++;
      // Carry forward any surplus to the next period
      carryover = Math.max(0, effectiveConfirmed - scheduledAmount);
      let paymentToInterest = Math.min(allocatedConfirmed, periodInterest);
      let paymentToPrincipal = Math.max(0, allocatedConfirmed - paymentToInterest);
      remainingPrincipal = Math.max(0, Math.round((remainingPrincipal - paymentToPrincipal) * 100) / 100);
      const isPast = toLocalDate(scheduleDates[i]) <= getLocalToday();
      periodResults.push({
        period: i + 1, date: scheduleDates[i], scheduledAmount: Math.round(scheduledAmount * 100) / 100,
        confirmedPaid: Math.round(allocatedConfirmed * 100) / 100,
        pendingPaid: Math.round(pendingInPeriod * 100) / 100,
        actualPaid: Math.round(allocatedConfirmed * 100) / 100,
        isFullPayment, isPast,
        hasConfirmedPayments: allocatedConfirmed > 0,
        hasPendingPayments: pendingInPeriod > 0,
        hasAnyPayments: allocatedConfirmed > 0 || pendingInPeriod > 0,
        deficit: 0, interestThisPeriod: periodInterest, remainingPrincipal,
        confirmedPayments: periodConfirmedPayments[i], allPayments: periodAllPayments[i]
      });
    }
    const totalOwedNow = Math.max(0, Math.round((principal + totalInterestAccrued - totalPaid) * 100) / 100);
    const unpaidPeriods = totalPeriods - fullPaymentCount;
    const recalcPayment = unpaidPeriods > 0 && totalOwedNow > 0 ? Math.round((totalOwedNow / unpaidPeriods) * 100) / 100 : 0;
    const currentPeriodIdx = periodResults.findIndex(p => !p.isFullPayment);
    const nextPaymentAmt = recalcPayment > 0 ? recalcPayment : originalPaymentAmount;
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: 'transparent', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: 14, marginBottom: 0 }}>
          <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px' }}>Principal Amount</p>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.amount)}</p>
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#1A1918', margin: 0 }}>
          <strong>{lenderInfo.full_name}</strong> agrees to lend <strong>{borrowerInfo.full_name}</strong> <strong>{formatMoney(agreement.amount)}</strong>{agreement.purpose ? <> for <strong>{agreement.purpose}</strong></> : ''}, with <strong>{agreement.interest_rate}%</strong> interest. <strong>{borrowerInfo.full_name}</strong> agrees to pay back <strong>{formatMoney(agreement.total_amount)}</strong> in <strong>{agreement.payment_frequency}</strong> payments of <strong>{formatMoney(agreement.payment_amount)}</strong> over <strong>{agreement.repayment_period} {agreement.repayment_unit || 'months'}</strong>.
        </p>
        <div style={{ background: 'transparent', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', margin: '0 0 10px' }}>Terms of Repayment</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
            <div><span style={{ color: '#787776' }}>Total Amount Due:</span> <span style={{ fontWeight: 500, color: '#1A1918' }}>{formatMoney(agreement.total_amount)}</span></div>
            <div><span style={{ color: '#787776' }}>Interest Rate:</span> <span style={{ fontWeight: 500, color: '#1A1918' }}>{agreement.interest_rate}%</span></div>
            <div><span style={{ color: '#787776' }}>Payment:</span> <span style={{ fontWeight: 500, color: '#1A1918' }}>{formatMoney(agreement.payment_amount)} {agreement.payment_frequency}</span></div>
            <div><span style={{ color: '#787776' }}>Term:</span> <span style={{ fontWeight: 500, color: '#1A1918' }}>{agreement.repayment_period} {agreement.repayment_unit || 'months'}</span></div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'transparent', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)', padding: 14 }}>
            <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px' }}>Borrower</p>
            <p style={{ fontSize: 18, fontStyle: 'italic', fontFamily: 'Georgia, serif', color: '#1A1918', margin: 0 }}>{agreement.borrower_name || borrowerInfo.full_name}</p>
            {agreement.borrower_signed_date && <p style={{ fontSize: 11, color: '#787776', margin: '4px 0 0' }}>Signed {format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy')}</p>}
          </div>
          <div style={{ background: 'transparent', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)', padding: 14 }}>
            <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px' }}>Lender</p>
            <p style={{ fontSize: 18, fontStyle: 'italic', fontFamily: 'Georgia, serif', color: '#1A1918', margin: 0 }}>{agreement.lender_name || lenderInfo.full_name}</p>
            {agreement.lender_signed_date && <p style={{ fontSize: 11, color: '#787776', margin: '4px 0 0' }}>Signed {format(new Date(agreement.lender_signed_date), 'MMM d, yyyy')}</p>}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ background: 'transparent', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: 12, textAlign: 'center' }}><p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Principal</p><p style={{ fontSize: 18, fontWeight: 700, color: '#1A1918', margin: '4px 0 0' }}>{formatMoney(agreement.amount)}</p></div>
          <div style={{ background: 'transparent', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: 12, textAlign: 'center' }}><p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Interest</p><p style={{ fontSize: 18, fontWeight: 700, color: '#1A1918', margin: '4px 0 0' }}>{formatMoney((agreement.total_amount || 0) - (agreement.amount || 0))}</p></div>
          <div style={{ background: 'transparent', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: 12, textAlign: 'center' }}><p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Total</p><p style={{ fontSize: 18, fontWeight: 700, color: '#1A1918', margin: '4px 0 0' }}>{formatMoney(agreement.total_amount)}</p></div>
        </div>
        <div style={{ maxHeight: 300, overflowX: 'auto', overflowY: 'auto', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', fontSize: 11, minWidth: 700, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'transparent' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 500, color: '#787776' }}>Payment</th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 500, color: '#787776' }}>Payment Date</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#787776' }}>Starting Balance</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#787776' }}>Principal Payment</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#787776' }}>Interest Payment</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#787776' }}>Principal to Date</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#787776' }}>Interest to Date</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#787776' }}>Ending Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, index) => (
                <tr key={row.number} style={{ background: index < paidPayments ? 'rgba(3,172,234,0.06)' : 'transparent', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  <td style={{ padding: '6px 8px', color: '#787776' }}>{row.number}</td>
                  <td style={{ padding: '6px 8px', color: '#1A1918' }}>{format(row.date, 'MMM d, yyyy')}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#787776' }}>{formatMoney(row.startingBalance)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500, color: '#1A1918' }}>{formatMoney(row.principal)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#787776' }}>{formatMoney(row.interest)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#787776' }}>{formatMoney(row.principalToDate)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#787776' }}>{formatMoney(row.interestToDate)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500, color: '#1A1918' }}>{formatMoney(row.endingBalance)}</td>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: 'transparent', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: 14 }}>
          <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px' }}>Purpose</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', margin: 0 }}>{loan?.purpose || agreement.purpose || 'Reason'}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'transparent', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px' }}>Loan Amount</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.amount)}</p>
          </div>
          <div style={{ background: 'transparent', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px' }}>Total Due</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.total_amount)}</p>
          </div>
        </div>
        {loan && (
          <div style={{ background: 'transparent', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#787776' }}>Payment Progress</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>{formatMoney(loan.amount_paid || 0)} / {formatMoney(agreement.total_amount)}</span>
            </div>
            <div style={{ width: '100%', background: 'white', borderRadius: 3, height: 6 }}>
              <div style={{ background: '#03ACEA', height: 6, borderRadius: 3, transition: 'width 0.3s', width: `${Math.min(100, ((loan.amount_paid || 0) / agreement.total_amount) * 100)}%` }} />
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={16} style={{ color: '#787776' }} />
              <div><p style={{ color: '#787776', margin: 0 }}>Interest Rate</p><p style={{ fontWeight: 600, color: '#1A1918', margin: 0 }}>{agreement.interest_rate}%</p></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={16} style={{ color: '#787776' }} />
              <div><p style={{ color: '#787776', margin: 0 }}>Payment Amount</p><p style={{ fontWeight: 600, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.payment_amount)}</p></div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: '#787776' }} />
              <div><p style={{ color: '#787776', margin: 0 }}>Payment Frequency</p><p style={{ fontWeight: 600, color: '#1A1918', margin: 0, textTransform: 'capitalize' }}>{agreement.payment_frequency}</p></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} style={{ color: '#787776' }} />
              <div><p style={{ color: '#787776', margin: 0 }}>Due Date</p><p style={{ fontWeight: 600, color: '#1A1918', margin: 0 }}>{agreement.due_date ? format(new Date(agreement.due_date), 'MMM d, yyyy') : 'N/A'}</p></div>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', margin: '0 0 12px' }}>Parties</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[{ label: 'Lender', info: lenderInfo }, { label: 'Borrower', info: borrowerInfo }].map(({ label, info }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <UserAvatar name={info.full_name} src={info.profile_picture_url} size={40} />
                <div><p style={{ fontSize: 11, color: '#787776', margin: 0 }}>{label}</p><p style={{ fontWeight: 500, color: '#1A1918', margin: 0 }}>{info.full_name}</p></div>
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
    const barColor = isLending ? '#03ACEA' : '#1D5B94';
    const barBg = isLending ? 'rgba(3,172,234,0.1)' : 'rgba(29,91,148,0.1)';

    const glowBox = {
      padding: 16, borderRadius: 10, background: 'white',
      boxShadow: '0 0 0 2px rgba(3,172,234,0.25), 0 0 16px rgba(3,172,234,0.12), 0 2px 12px rgba(0,0,0,0.04)',
      border: '1.5px solid rgba(3,172,234,0.35)',
    };
    const isLate = nextPaymentDays !== null && nextPaymentDays < 0;
    const daysLabel = nextPaymentDays === null ? null : isLate ? `${Math.abs(nextPaymentDays)}d late` : nextPaymentDays === 0 ? 'today' : `${nextPaymentDays}d`;
    const badgeColor = isLate ? '#E8726E' : '#03ACEA';
    const badgeBg = isLate ? 'rgba(232,114,110,0.08)' : 'rgba(3,172,234,0.10)';

    const totalOwedAll = activeLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
    const totalPaidAll = activeLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);
    const pctAll = totalOwedAll > 0 ? Math.round((totalPaidAll / totalOwedAll) * 100) : 0;

    return (
      <>
        {/* 1. Three standalone top cards */}
        <div className="loans-top-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 20, alignItems: 'center' }}>
          {/* Next Incoming / Next Payment Due — aurora card identical to Home page */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Aurora glow — cyan/teal palette */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'calc(100% + 10px)', height: 'calc(100% + 10px)',
              background: 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(6,182,212) 30%, rgb(20,184,166) 60%, rgb(3,172,234) 100%)',
              filter: 'blur(5px) saturate(1.2)', opacity: 0.35,
              borderRadius: 18, zIndex: 0, pointerEvents: 'none',
            }} />
            {/* Gradient border wrapper */}
            <div style={{
              position: 'relative', zIndex: 1, flex: 1,
              background: 'linear-gradient(to right, rgba(3,172,234,0) 0%, #03ACEA 67%, #03ACEA 100%)',
              padding: 1, borderRadius: 11, display: 'flex', flexDirection: 'column',
            }}>
            {/* Card */}
            <div style={{
              flex: 1,
              padding: '10px 14px', borderRadius: 10,
              background: '#ffffff',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: isLending ? 'rgba(3,172,234,0.12)' : 'rgba(29,91,148,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isLending
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D5B94" strokeWidth="2.5" strokeLinecap="round"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="18" x2="12" y2="6"/></svg>
                  }
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {isLending ? 'Next Payment Incoming' : 'Next Payment Due'}
                </span>
              </div>
              {nextPaymentLoan ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', flexShrink: 0 }}>
                    {format(new Date(nextPaymentLoan.next_payment_date), 'MMM d')}
                  </span>
                  {daysLabel && <span style={{ fontSize: 9, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>{daysLabel}</span>}
                  <span style={{ fontSize: 11, color: '#9B9A98', marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {formatMoney(nextPaymentAmount)} {isLending ? 'from' : 'to'} {otherPartyUsername}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                  <span style={{ fontSize: 11, color: '#9B9A98' }}>{isLending ? 'None incoming ✨' : 'Nothing due 🎉'}</span>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Next Payment Amount — aurora style (lending only) */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'calc(100% + 10px)', height: 'calc(100% + 10px)',
              background: 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(6,182,212) 30%, rgb(20,184,166) 60%, rgb(3,172,234) 100%)',
              filter: 'blur(5px) saturate(1.2)', opacity: 0.35,
              borderRadius: 18, zIndex: 0, pointerEvents: 'none',
            }} />
            {/* Gradient border wrapper */}
            <div style={{
              position: 'relative', zIndex: 1, flex: 1,
              background: 'linear-gradient(to right, rgba(3,172,234,0) 0%, #03ACEA 67%, #03ACEA 100%)',
              padding: 1, borderRadius: 11, display: 'flex', flexDirection: 'column',
            }}>
            {/* Card */}
            <div style={{
              flex: 1,
              padding: '10px 14px', borderRadius: 10,
              background: '#ffffff',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: isLending ? 'rgba(3,172,234,0.12)' : 'rgba(29,91,148,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isLending ? '#03ACEA' : '#1D5B94'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Next Payment Amount</span>
              </div>
              {nextPaymentLoan ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', overflow: 'hidden' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', flexShrink: 0 }}>
                    {formatMoney(nextPaymentAmount)}
                  </span>
                  <span style={{ fontSize: 11, color: '#9B9A98', flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {isLending ? 'from' : 'to'} {otherPartyUsername}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                  <span style={{ fontSize: 11, color: '#9B9A98' }}>No payments yet ✨</span>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Total Active Lending / Active Borrowing — standalone glassmorphism */}
          <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(3,172,234,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {isLending ? 'Total Active Lending' : 'Active Borrowing'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em' }}>{formatMoney(totalOwedAll)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#03ACEA' }}>{pctAll}%</span>
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(3,172,234,0.12)', overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', borderRadius: 3, background: '#03ACEA', width: `${pctAll}%`, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
            <div style={{ fontSize: 10, color: '#9B9A98' }}>{formatMoney(totalPaidAll)} of {formatMoney(totalOwedAll)} repaid</div>
          </div>
        </div>

        {/* 2. Upcoming + Loan Progress side by side */}
        {(() => {
          const sourceLoans = isLending ? activeLendingLoans : activeBorrowingLoans;
          const otherPartyKey = isLending ? 'borrower_id' : 'lender_id';
          const allPaymentLoans = sourceLoans
            .filter(l => l.next_payment_date)
            .map(l => {
              const otherParty = publicProfiles.find(p => p.user_id === l[otherPartyKey]);
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
            <div className="loans-bottom-row" style={{ display: 'grid', gridTemplateColumns: activeLoans.length > 0 ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 20, alignItems: 'start' }}>
              <PageCard title="Upcoming" headerRight={<Link to={createPageUrl("Upcoming")} style={{ fontSize: 11, fontWeight: 500, color: '#03ACEA', textDecoration: 'none' }}>Full schedule →</Link>} style={{ marginBottom: 0 }}>
                {combinedLoans.length === 0 ? (
                  <div style={{ padding: '10px 0', fontSize: 13, color: '#9B9A98', textAlign: 'center' }}>You're all clear! Nothing coming up yet 🎉</div>
                ) : combinedLoans.map((loan) => {
                  const isOverdue = loan.days < 0;
                  const daysLbl = isOverdue ? `${Math.abs(loan.days)}d late` : loan.days === 0 ? 'today' : `${loan.days}d`;
                  const amtSign = isLending ? '+' : '-';
                  return (
                    <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
                      <div style={{
                        minWidth: 42, textAlign: 'center', flexShrink: 0,
                        fontSize: 10, fontWeight: 700, lineHeight: 1.2,
                        color: isOverdue ? '#E8726E' : loan.days <= 3 ? '#F59E0B' : '#9B9A98',
                        background: isOverdue ? 'rgba(232,114,110,0.08)' : loan.days <= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.04)',
                        borderRadius: 6, padding: '3px 6px',
                      }}>
                        {daysLbl}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isLending
                          ? <><strong>{loan.firstName}</strong> pays you</>
                          : <>Pay <strong>{loan.firstName}</strong></>}
                        {loan.purpose && <span style={{ color: '#9B9A98', fontWeight: 400 }}> · {loan.purpose}</span>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: isLending ? '#03ACEA' : '#1A1918', letterSpacing: '-0.01em' }}>
                        {amtSign}{formatMoney(loan.payment_amount || 0)}
                      </span>
                    </div>
                  );
                })}
              </PageCard>

              {/* Active Lending / Active Borrowing — right of Upcoming */}
              {activeLoans.length > 0 && (
                <PageCard title={isLending ? 'Active Lending' : 'Active Borrowing'} headerRight={<Link to={createPageUrl("YourLoans")} style={{ fontSize: 11, fontWeight: 500, color: '#03ACEA', textDecoration: 'none' }}>View all →</Link>} style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {activeLoans.slice(0, 5).map((loan) => {
                      const otherProfile = publicProfiles.find(p => p.user_id === (isLending ? loan.borrower_id : loan.lender_id));
                      const totalAmt = loan.total_amount || loan.amount || 0;
                      const paidAmt = loan.amount_paid || 0;
                      const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                      const name = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'User';
                      const purpose = loan.purpose ? ` for ${loan.purpose}` : '';
                      const loanDesc = isLending
                        ? `You lent ${name} ${formatMoney(totalAmt)}${purpose}`
                        : `${name} lent you ${formatMoney(totalAmt)}${purpose}`;
                      return (
                        <div key={loan.id} style={{ padding: '9px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <UserAvatar name={otherProfile?.full_name || otherProfile?.username} src={otherProfile?.profile_picture_url} size={20} radius={5} />
                            <div style={{ fontSize: 13, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loanDesc}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: isLending ? 'rgba(3,172,234,0.1)' : 'rgba(29,91,148,0.1)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 3, background: isLending ? '#03ACEA' : '#1D5B94', width: `${pct}%`, transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#9B9A98', flexShrink: 0 }}>{pct}%</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 3 }}>{formatMoney(paidAmt)} of {formatMoney(totalAmt)} {isLending ? 'paid back' : 'repaid'}</div>
                        </div>
                      );
                    })}
                  </div>
                </PageCard>
              )}
            </div>
          );
        })()}

        {/* 6. Loans Ranked By — borrowing only, reformatted */}
        {!isLending && activeLoans.length > 0 && (
          <PageCard title="Loans Ranked By" headerRight={
            <Select value={rankingFilter} onValueChange={setRankingFilter}>
              <SelectTrigger className="w-auto h-7 px-2 border-0 text-xs font-medium rounded-lg" style={{ background: 'rgba(29,91,148,0.10)', color: '#1D5B94' }}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="highest_interest">Highest Interest</SelectItem>
                <SelectItem value="highest_payment">Highest Payment</SelectItem>
                <SelectItem value="soonest_deadline">Soonest Deadline</SelectItem>
              </SelectContent>
            </Select>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(() => {
                const sorted = [...activeLoans].sort((a, b) => {
                  if (rankingFilter === 'highest_interest') return (b.interest_rate || 0) - (a.interest_rate || 0);
                  if (rankingFilter === 'highest_payment') return (b.payment_amount || 0) - (a.payment_amount || 0);
                  if (rankingFilter === 'soonest_deadline') { const dateA = a.next_payment_date ? new Date(a.next_payment_date) : new Date('2099-01-01'); const dateB = b.next_payment_date ? new Date(b.next_payment_date) : new Date('2099-01-01'); return dateA - dateB; }
                  return 0;
                });
                return sorted.slice(0, 5).map((loan, idx) => {
                  const otherParty = publicProfiles.find(p => p.user_id === loan.lender_id);
                  const totalAmt = loan.total_amount || loan.amount || 0;
                  const paidAmt = loan.amount_paid || 0;
                  const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                  const name = otherParty?.full_name?.split(' ')[0] || otherParty?.username || 'User';
                  const purpose = loan.purpose ? ` for ${loan.purpose}` : '';
                  return (
                    <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(29,91,148,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#1D5B94' }}>{idx + 1}</span>
                      </div>
                      <div style={{ flex: 1, fontSize: 13, color: '#1A1918', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name} lent you {formatMoney(totalAmt)}{purpose}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9A98', flexShrink: 0 }}>{pct}% repaid</span>
                    </div>
                  );
                });
              })()}
            </div>
          </PageCard>
        )}
      </>
    );
  };

  // --- Individual Loan Details Tab ---
  const renderDetailsTab = () => {
    if (allManageableLoans.length === 0) {
      return (
        <PageCard title="Loan Details">
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: '#787776' }}>No loans to display yet 🌱</div>
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

    const getLoanDescription = (loan) => {
      const isLend = loan.lender_id === user?.id;
      const other = publicProfiles.find(p => p.user_id === (isLend ? loan.borrower_id : loan.lender_id));
      const name = other?.full_name || 'User';
      const amt = `$${(loan.amount || 0).toLocaleString()}`;
      const reason = loan.purpose ? ` for ${loan.purpose}` : '';
      return isLend ? `Lent ${amt} to ${name}${reason}` : `Borrowed ${amt} from ${name}${reason}`;
    };

    return (
      <div>
        {/* Select a Loan */}
        <div style={{ marginBottom: manageLoanSelected ? 8 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Select a Loan</span>
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 14 }} />
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setLoanDropdownOpen(o => !o)}
              style={{ width: '100%', borderRadius: 10, padding: '10px 36px 10px 14px', fontSize: 13, fontWeight: 500, color: manageLoanSelected ? '#1A1918' : '#9B9A98', background: 'white', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.09)', minHeight: 40, userSelect: 'none', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              {manageLoanSelected ? getLoanDescription(manageLoanSelected) : 'Choose a loan to view details…'}
            </div>
            <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, bottom: 0, right: 12, display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {loanDropdownOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setLoanDropdownOpen(false)} />
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#ffffff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {allManageableLoans.map((loan) => (
                    <div key={loan.id} onClick={() => { setManageLoanSelected(loan); setLoanDropdownOpen(false); }}
                      style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#1A1918', cursor: 'pointer', background: manageLoanSelected?.id === loan.id ? 'rgba(0,0,0,0.04)' : 'transparent', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = manageLoanSelected?.id === loan.id ? 'rgba(0,0,0,0.04)' : 'transparent'}
                    >
                      {getLoanDescription(loan)}{loan.status === 'cancelled' ? <span style={{ fontSize: 11, color: '#E8726E', marginLeft: 8 }}>Cancelled</span> : ''}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Selected loan description */}
        {manageLoanSelected && (
          <div style={{ background: '#ffffff', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(3,172,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>{getLoanDescription(manageLoanSelected)}{manageLoanSelected.status === 'cancelled' ? <span style={{ fontSize: 11, color: '#E8726E', marginLeft: 8 }}>Cancelled</span> : null}</span>
          </div>
        )}


        {/* Single-column flow */}
        {manageLoanSelected && <>
          {/* 3. Payment Progress | NP cards + Loan Terms */}
          {(() => {
            const totalOwedNow = loanAnalysis ? loanAnalysis.totalOwedNow : (manageLoanSelected.total_amount || manageLoanSelected.amount || 0);
            const totalPaidAmt = loanAnalysis ? loanAnalysis.totalPaid : (manageLoanSelected.amount_paid || 0);
            const loanPrincipal = manageLoanSelected.amount || 0;
            const totalWithInterest = loanAnalysis ? (loanAnalysis.principal + loanAnalysis.totalInterestAccrued) : (manageLoanSelected.total_amount || loanPrincipal);
            const paidPct = loanAnalysis ? loanAnalysis.paidPercentage : (totalWithInterest > 0 ? (totalPaidAmt / totalWithInterest) * 100 : 0);
            const nextPmtAmt = loanAnalysis ? loanAnalysis.nextPaymentAmount : (recalculatedPayment > 0 ? recalculatedPayment : (manageLoanSelected.payment_amount || 0));
            let nextPmtDate = null; let daysUntil = null;
            if (manageLoanSelected.next_payment_date) { nextPmtDate = toLocalDate(manageLoanSelected.next_payment_date); daysUntil = daysUntilDate(manageLoanSelected.next_payment_date); }
            const isLate = daysUntil !== null && daysUntil < 0;
            const dLabel = daysUntil === null ? null : isLate ? `${Math.abs(daysUntil)}d late` : daysUntil === 0 ? 'today' : `${daysUntil}d`;
            const badgeColor = isLate ? '#E8726E' : isLending ? '#03ACEA' : (daysUntil !== null && daysUntil <= 3 ? '#F59E0B' : '#9B9A98');
            const badgeBg = isLate ? 'rgba(232,114,110,0.08)' : isLending ? 'rgba(3,172,234,0.10)' : (daysUntil !== null && daysUntil <= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.04)');
            const size = 140; const dCx = size / 2; const dCy = size / 2;
            const ringR = 54; const ringStroke = 9;
            const ringCirc = 2 * Math.PI * ringR; const ringDash = (paidPct / 100) * ringCirc;
            // Aurora style helpers
            const iconBg = isLending ? 'rgba(3,172,234,0.12)' : 'rgba(29,91,148,0.12)';
            const iconColor = isLending ? '#03ACEA' : '#1D5B94';
            const AuroraCard = ({ children }) => (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Aurora glow — cyan/teal palette */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% + 10px)', height: 'calc(100% + 10px)', background: 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(6,182,212) 30%, rgb(20,184,166) 60%, rgb(3,172,234) 100%)', filter: 'blur(5px) saturate(1.2)', opacity: 0.35, borderRadius: 18, zIndex: 0, pointerEvents: 'none' }} />
                {/* Gradient border wrapper */}
                <div style={{ position: 'relative', zIndex: 1, flex: 1, background: 'linear-gradient(to right, rgba(3,172,234,0) 0%, #03ACEA 67%, #03ACEA 100%)', padding: 1, borderRadius: 11, display: 'flex', flexDirection: 'column' }}>
                {/* Card */}
                <div style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: '#ffffff' }}>
                  {children}
                </div>
                </div>
              </div>
            );
            // Loan terms items
            const amount = manageLoanSelected.amount || 0;
            const interestRate = manageLoanSelected.interest_rate || 0;
            const repaymentPeriod = manageLoanSelected.repayment_period || 0;
            const repaymentUnit = manageLoanSelected.repayment_unit || 'months';
            const paymentFrequency = manageLoanSelected.payment_frequency || 'monthly';
            const loanTermItems = [
              { label: 'Loan Amount', value: `$${amount.toLocaleString()}` },
              { label: 'Interest Rate', value: `${interestRate}%` },
              { label: 'Term', value: `${repaymentPeriod} ${repaymentUnit}` },
              { label: 'Frequency', value: paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1) },
            ];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
                {/* Left: NP Date + NP Amount side by side, then Loan Terms below */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* NP Date */}
                    <AuroraCard>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isLending
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="18" x2="12" y2="6"/></svg>
                          }
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{isLending ? 'Next Payment Incoming' : 'Next Payment Due'}</span>
                      </div>
                      {nextPmtDate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', flexShrink: 0 }}>{format(nextPmtDate, 'MMM d')}</span>
                          {dLabel && <span style={{ fontSize: 9, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>{dLabel}</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                      )}
                    </AuroraCard>
                    {/* NP Amount */}
                    <AuroraCard>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Next Payment Amount</span>
                      </div>
                      {nextPmtDate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', flexShrink: 0 }}>{formatMoney(nextPmtAmt)}</span>
                          <span style={{ fontSize: 11, color: '#9B9A98', marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>{isLending ? `from ${otherPartyUsername}` : `to ${otherPartyUsername}`}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                      )}
                    </AuroraCard>
                  </div>
                  {/* Loan Terms — full width of left column */}
                  <PageCard title="Loan Terms" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {loanTermItems.map((item, idx) => (<div key={idx} style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p><p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p></div>))}
                    </div>
                  </PageCard>
                </div>
                {/* Right: Payment Progress */}
                <PageCard title="Payment Progress" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={dCx} cy={dCy} r={ringR} fill="none" stroke="#E5E4E2" strokeWidth={ringStroke} strokeLinecap="round" />
                    {paidPct > 0 && (
                      <circle cx={dCx} cy={dCy} r={ringR} fill="none" stroke="#03ACEA" strokeWidth={ringStroke}
                        strokeDasharray={`${ringDash} ${ringCirc - ringDash}`} strokeLinecap="round"
                        transform={`rotate(-90 ${dCx} ${dCy})`} />
                    )}
                    <text x={dCx} y={dCy - 7} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 20, fontWeight: 700, fill: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{Math.round(paidPct)}%</text>
                    <text x={dCx} y={dCy + 12} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fontWeight: 500, fill: '#787776', fontFamily: "'DM Sans', sans-serif" }}>repaid</text>
                  </svg>
                  <p style={{ fontSize: 11, fontWeight: 500, color: '#1A1918', marginTop: 6, textAlign: 'center' }}>
                    <span style={{ fontWeight: 700 }}>${totalPaidAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span style={{ color: '#787776' }}> of ${totalWithInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isLending ? 'repaid' : 'paid back'}</span>
                  </p>
                  </div>
                </PageCard>
              </div>
            );
          })()}

          {/* 2-col masonry: left = Payment History + Docs, right = Payments */}
          <div className="loan-details-masonry" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <PageCard title="Payment History">
            <div>
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
                    {chartData.map((d, i) => {
                      const effectiveHeight = chartHeight - 14;
                      const barHeight = maxChartVal > 0 ? (d.amount / maxChartVal) * effectiveHeight : 0;
                      const scheduledBarHeight = maxChartVal > 0 && d.scheduledAmount ? (d.scheduledAmount / maxChartVal) * effectiveHeight : barHeight;
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
                                background: d.isProjected ? 'rgba(84,166,207,0.28)' : d.isMissed ? 'rgba(232,114,110,0.3)' : d.amount === 0 ? '#E5E4E2' : isPendingOnly ? 'rgba(0,0,0,0.1)' : isFullPmt ? '#03ACEA' : isPartialPmt ? 'rgba(245,158,11,0.6)' : 'rgba(3,172,234,0.25)',
                                border: d.isProjected ? '1px dashed rgba(84,166,207,0.5)' : d.isMissed ? '1px dashed rgba(232,114,110,0.5)' : isPendingOnly ? '1px dashed rgba(0,0,0,0.15)' : 'none',
                              }} title={`${d.label}: $${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}${d.isProjected ? ' (expected)' : d.isMissed ? ' (missed)' : isPendingOnly ? ' (pending)' : isPartialPmt ? ' (partial)' : ''}`} />
                            )}
                          </div>
                          <p style={{ fontSize: 11, marginTop: 5, lineHeight: 1, color: isInProgress ? '#03ACEA' : d.isProjected ? '#54A6CF' : d.isMissed ? '#E8726E' : isPendingOnly ? '#9B9A98' : '#4B4A48' }}>{d.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#03ACEA' }} /><span style={{ fontSize: 11, color: '#4B4A48' }}>Completed</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0,0,0,0.1)', border: '1px dashed rgba(0,0,0,0.15)' }} /><span style={{ fontSize: 11, color: '#4B4A48' }}>Pending</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(84,166,207,0.28)', border: '1px dashed rgba(84,166,207,0.5)' }} /><span style={{ fontSize: 11, color: '#4B4A48' }}>Expected</span></div>
                </div>
              </div>
            )}
            </div>
          </PageCard>

          {/* Doc boxes — black, centered below Payment History */}
          <div className="loan-details-doc-boxes" style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Promissory Note */}
            <div style={{ position: 'relative' }}>
              <div style={{ background: '#1A1918', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px' }}>
                <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === manageLoanSelected.id); if (ag) openDocPopup('promissory', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, whiteSpace: 'nowrap' }}>Promissory Note</p>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setInfoTooltip(infoTooltip === 'promissory' ? null : 'promissory'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 800, color: '#1A1918', lineHeight: 1 }}>i</span></span>
                </button>
              </div>
              {infoTooltip === 'promissory' && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 9, padding: '8px 11px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)', width: 200, zIndex: 200, border: '1px solid rgba(0,0,0,0.06)' }}>
                  <p style={{ fontSize: 11, color: '#1A1918', margin: 0, lineHeight: 1.55 }}>A signed legal document where the borrower promises to repay a specific amount under agreed terms.</p>
                </div>
              )}
            </div>
            {/* Amortization Schedule */}
            <div style={{ position: 'relative' }}>
              <div style={{ background: '#1A1918', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px' }}>
                <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === manageLoanSelected.id); if (ag) openDocPopup('amortization', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, whiteSpace: 'nowrap' }}>Amortization Schedule</p>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setInfoTooltip(infoTooltip === 'amortization' ? null : 'amortization'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 800, color: '#1A1918', lineHeight: 1 }}>i</span></span>
                </button>
              </div>
              {infoTooltip === 'amortization' && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 9, padding: '8px 11px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)', width: 200, zIndex: 200, border: '1px solid rgba(0,0,0,0.06)' }}>
                  <p style={{ fontSize: 11, color: '#1A1918', margin: 0, lineHeight: 1.55 }}>A table showing each scheduled payment broken down into principal and interest over the life of the loan.</p>
                </div>
              )}
            </div>
            {/* Loan Summary */}
            <div style={{ background: '#1A1918', borderRadius: 10, display: 'inline-flex', alignItems: 'center', padding: '9px 14px' }}>
              <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === manageLoanSelected.id); if (ag) openDocPopup('summary', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, whiteSpace: 'nowrap' }}>Loan Summary</p>
              </button>
            </div>
          </div>
          </div>{/* end left column */}

          {/* Right column: Payments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <PageCard title="Payments">
            <div>
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
                const expectedAmount = loanAnalysis.originalPaymentAmount || paymentAmt;
                const paidAmount = pr.actualPaid || 0;
                const paidPercentage = status === 'completed' ? 100 : (status === 'partial' && expectedAmount > 0) ? Math.min(99, (paidAmount / expectedAmount) * 100) : 0;
                return { number: pr.period, date: pr.date, amount: expectedAmount, paidAmount, paidPercentage, status };
              }) : [];
              const statusConfig = {
                completed:   { label: 'Completed',   bg: 'rgba(22,163,74,0.18)',  text: '#16A34A', ringColor: '#16A34A', fillColor: '#16A34A' },
                partial:     { label: 'Partial',     bg: 'rgba(3,172,234,0.18)', text: '#0288CE', ringColor: '#0288CE', fillColor: '#0288CE' },
                pending:     { label: 'Pending',     bg: 'rgba(0,0,0,0.05)',     text: '#9B9A98', ringColor: 'rgba(0,0,0,0.15)', fillColor: 'rgba(0,0,0,0.1)' },
                missed:      { label: 'Missed',         bg: 'rgba(232,114,110,0.1)', text: '#E8726E', ringColor: '#E8726E', fillColor: '#E8726E' },
                upcoming:    { label: 'Upcoming',       bg: 'rgba(0,0,0,0.03)',      text: '#787776', ringColor: 'rgba(0,0,0,0.12)', fillColor: 'rgba(0,0,0,0.06)' },
              };
              const PieCircle = ({ percentage, number, size = 32 }) => {
                const pcx = size / 2; const pcy = size / 2; const r = (size / 2) - 3;
                const circ = 2 * Math.PI * r; const dash = (percentage / 100) * circ; const sw = 4;
                return (
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
                    <circle cx={pcx} cy={pcy} r={r} fill="none" stroke="#E5E4E2" strokeWidth={sw} />
                    {percentage > 0 && (<circle cx={pcx} cy={pcy} r={r} fill="none" stroke="#03ACEA" strokeWidth={sw} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform={`rotate(-90 ${pcx} ${pcy})`} />)}
                    <text x={pcx} y={pcy} textAnchor="middle" dominantBaseline="central" fill="#1A1918" fontSize="11" fontWeight="bold" fontFamily="'DM Sans', sans-serif">{number}</text>
                  </svg>
                );
              };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...(paymentRows.length > 8 ? { maxHeight: 460, overflowY: 'auto', scrollbarWidth: 'thin' } : {}) }}>
                  {paymentRows.map((row) => {
                    const cfg = statusConfig[row.status];
                    return (
                      <div key={row.number} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, background: 'transparent' }}>
                        <PieCircle percentage={row.paidPercentage} number={row.number} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#4B4A48', margin: 0 }}>Amount Due for Payment {row.number}: ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          {row.status === 'partial' && row.paidAmount > 0 && (
                            <>
                              <p style={{ fontSize: 12, fontWeight: 700, color: '#15803D', margin: '1px 0 0' }}>Paid: ${row.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              <p style={{ fontSize: 11, fontWeight: 600, color: '#03ACEA', margin: '1px 0 0' }}>Remaining: ${Math.max(0, row.amount - row.paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </>
                          )}
                          {row.status !== 'partial' && row.paidAmount > 0 && <p style={{ fontSize: 12, fontWeight: 700, color: '#15803D', margin: '1px 0 0' }}>Paid: ${row.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
                          <p style={{ fontSize: 11, color: '#4B4A48', margin: '1px 0 0' }}>Due: {format(row.date, 'MMM d, yyyy')}</p>
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

          </div>{/* end right column */}
          </div>{/* end 2-col masonry */}

          {/* Activity | Loan Progress row */}
          <div className="loan-details-activity-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start', marginTop: 24 }}>
          <PageCard title="Activity">
            <div>
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
                created:      { bg: 'rgba(3,172,234,0.12)',   stroke: '#03ACEA',  path: 'M12 4v16m8-8H4',                                                                                                                                         sz: 14, sw: 2 },
                signature:    { bg: 'rgba(124,58,237,0.12)',  stroke: '#7C3AED',  path: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',                                                     sz: 14, sw: 2 },
                payment:      { bg: 'rgba(22,163,74,0.12)',   stroke: '#16A34A',  path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',          sz: 17, sw: 2.5 },
                cancellation: { bg: 'rgba(232,114,110,0.12)', stroke: '#E8726E',  path: 'M6 18L18 6M6 6l12 12',                                                                                                                                    sz: 14, sw: 2 },
                completion:   { bg: 'rgba(22,163,74,0.12)',   stroke: '#16A34A',  path: 'M5 13l4 4L19 7',                                                                                                                                          sz: 14, sw: 2 },
              };
              const getIcon = (type) => {
                const cfg = activityIconConfig[type] || activityIconConfig.created;
                return <svg width={cfg.sz} height={cfg.sz} fill="none" viewBox="0 0 24 24" stroke={cfg.stroke} strokeWidth={cfg.sw}><path strokeLinecap="round" strokeLinejoin="round" d={cfg.path} /></svg>;
              };
              const getDotStyle = (type) => {
                const cfg = activityIconConfig[type] || activityIconConfig.created;
                return { width: 24, height: 24, borderRadius: 6, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 10, marginTop: 2, boxShadow: '0 0 0 3px white' };
              };
              if (activities.length === 0) return <p style={{ fontSize: 11, color: '#C7C6C4', textAlign: 'center' }}>No activity recorded yet ✨</p>;
              return (
                <div className="space-y-0 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {activities.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 relative">
                      {idx < activities.length - 1 && <div className="absolute left-[12px] top-[23px] w-[1px]" style={{ height: 'calc(100% - 6px)', background: 'rgba(84,166,207,0.2)' }} />}
                      <div style={getDotStyle(activity.type)}>{getIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', lineHeight: 1.4 }}>{activity.description}</p>
                          {activity.isAwaitingConfirmation && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 whitespace-nowrap">Awaiting Confirmation</span>}
                        </div>
                        <p style={{ fontSize: 11, color: '#5C5B5A', marginTop: 2 }}>{format(activity.timestamp, 'MMM d, yyyy · h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            </div>
          </PageCard>
          <PageCard title="Loan Progress">
            <div>
            {(() => {
              const repaymentPeriod = manageLoanSelected.repayment_period || 0;
              const paymentFrequency = manageLoanSelected.payment_frequency || 'monthly';
              const totalOwedDisplay = loanAnalysis ? loanAnalysis.totalOwedNow : (manageLoanSelected.total_amount || manageLoanSelected.amount || 0);
              const amountPaidDisplay = loanAnalysis ? loanAnalysis.totalPaid : (manageLoanSelected.amount_paid || 0);
              const fullPayments = loanAnalysis ? loanAnalysis.fullPaymentCount : 0;
              const paymentAmountDisplay = loanAnalysis ? loanAnalysis.nextPaymentAmount : (recalculatedPayment > 0 ? recalculatedPayment : (manageLoanSelected.payment_amount || 0));
              const freqLabel = paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1);
              const lpItems = [
                { label: isLending ? 'Total Owed to You' : 'Total Owed', value: `$${totalOwedDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'with interest' },
                { label: isLending ? 'Amount Received' : 'Amount Paid', value: `$${amountPaidDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: null },
                { label: 'Payments Made', value: `${fullPayments}/${repaymentPeriod}`, sub: 'full payments' },
                { label: `${freqLabel} Payments`, value: `$${paymentAmountDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: isLending ? `from ${otherPartyUsername}` : `to ${otherPartyUsername}` },
              ];
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {lpItems.map((item, idx) => (<div key={idx} style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p><p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p>{item.sub && <p style={{ fontSize: 9, color: '#787776', marginTop: 2 }}>{item.sub}</p>}</div>))}
                </div>
              );
            })()}
            </div>
          </PageCard>
          </div>{/* end Activity | Loan Progress row */}

          {/* 11. Cancelled notice */}
          {manageLoanSelected.status === 'cancelled' && (
            <div className="bg-red-50 rounded-xl px-4 py-3 shadow-sm border border-red-200"><p className="text-sm text-red-600 font-medium">This loan has been cancelled.</p></div>
          )}
        </>}
      </div>
    );
  };

  const LENDER_GREEN = '#03ACEA';

  const PageCard = ({ title, headerRight, children, style, highlight }) => (
    <div style={{
      marginBottom: 24,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
      borderRadius: 10,
      border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
      padding: '14px 18px',
      ...style
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 4, borderBottom: highlight ? '1px solid rgba(3,172,234,0.2)' : '1px solid rgba(0,0,0,0.07)' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: highlight ? '#03ACEA' : '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</span>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
      <div style={{ overflow: 'visible', ...(highlight ? { display: 'flex', flexDirection: 'column' } : {}) }}>
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

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const monthlyReceived = allPayments
    .filter(p => p.status === 'confirmed' || p.status === 'completed')
    .filter(p => { const loan = allLoans.find(l => l.id === p.loan_id); return loan && loan.lender_id === user?.id; })
    .filter(p => { const d = new Date(p.payment_date || p.created_at); return d >= monthStart && d <= monthEnd; })
    .reduce((s, p) => s + (p.amount || 0), 0);
  const monthlyPaidOut = allPayments
    .filter(p => p.status === 'confirmed' || p.status === 'completed')
    .filter(p => { const loan = allLoans.find(l => l.id === p.loan_id); return loan && loan.borrower_id === user?.id; })
    .filter(p => { const d = new Date(p.payment_date || p.created_at); return d >= monthStart && d <= monthEnd; })
    .reduce((s, p) => s + (p.amount || 0), 0);
  const monthlyExpectedReceive = activeLendingLoans.reduce((s, l) => s + (l.payment_amount || 0), 0);
  const monthlyExpectedPay = activeBorrowingLoans.reduce((s, l) => s + (l.payment_amount || 0), 0);
  const pendingToConfirm = allPayments.filter(p => {
    const loan = allLoans.find(l => l.id === p.loan_id);
    return loan && loan.lender_id === user?.id && p.status === 'pending_confirmation';
  });

  return (
    <>
      <MeshMobileNav user={user} activePage="My Loans" />
      {/* Document Popup Modal */}
      <AnimatePresence>
        {activeDocPopup && docPopupAgreement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeDocPopup}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#F5F4F0', borderRadius: 18, maxWidth: activeDocPopup === 'amortization' ? 'min(960px, calc(100vw - 32px))' : 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.16)' }}>
              <div style={{ position: 'sticky', top: 0, background: 'transparent', padding: '6px 14px 5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '18px 18px 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} style={{ color: '#9B9A98' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                    {activeDocPopup === 'promissory' && 'Promissory Note'}
                    {activeDocPopup === 'amortization' && 'Amortization Schedule'}
                    {activeDocPopup === 'summary' && 'Loan Summary'}
                  </span>
                </div>
                <button onClick={closeDocPopup} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#787776' }}><X size={20} /></button>
              </div>
              <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 10, padding: 20 }}>
                {activeDocPopup === 'promissory' && <PromissoryNotePopup agreement={docPopupAgreement} />}
                {activeDocPopup === 'amortization' && <AmortizationSchedulePopup agreement={docPopupAgreement} />}
                {activeDocPopup === 'summary' && <LoanSummaryPopup agreement={docPopupAgreement} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Three-column layout */}
      <div className="mesh-layout" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── LEFT: Sidebar nav ── */}
        <div className="mesh-left" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ position: 'sticky', top: 0, padding: '24px 8px 0' }}>
            <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.3rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 16, paddingLeft: 6 }}>Vony</Link>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'Home', to: '/' },
                { label: 'Upcoming', to: createPageUrl("Upcoming") },
                { label: 'Create Loan', to: createPageUrl("CreateOffer") },
                { label: 'Record Payment', to: createPageUrl("RecordPayment") },
                { label: 'My Loans', to: createPageUrl("YourLoans") },
                { label: 'Friends', to: createPageUrl("Friends") },
                { label: 'Recent Activity', to: createPageUrl("RecentActivity") },
                { label: 'Documents', to: createPageUrl("LoanAgreements") },
              ].map(({ label, to }) => {
                const currentPath = window.location.pathname;
                const isActive = to === '/' ? currentPath === '/' : currentPath.includes(to.split('?')[0].replace('/app/', ''));
                const navIcons = {
                'Home': <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>,
                'Upcoming': <svg width="15" height="15" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="16" rx="2.5" fill="currentColor"/><rect x="3" y="6" width="18" height="6.5" rx="2.5" fill="rgba(0,0,0,0.2)"/><rect x="8" y="2.5" width="2" height="5" rx="1" fill="currentColor"/><rect x="14" y="2.5" width="2" height="5" rx="1" fill="currentColor"/><rect x="7" y="15" width="2.5" height="2.5" rx="0.5" fill="rgba(255,255,255,0.8)"/><rect x="11.5" y="15" width="2.5" height="2.5" rx="0.5" fill="rgba(255,255,255,0.8)"/><rect x="16" y="15" width="2.5" height="2.5" rx="0.5" fill="rgba(255,255,255,0.5)"/></svg>,
                'Create Loan': <svg width="15" height="15" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M12 7v10M7 12h10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>,
                'Record Payment': <svg width="15" height="15" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2.5" fill="currentColor"/><rect x="2" y="9" width="20" height="4" fill="rgba(0,0,0,0.22)"/><rect x="5" y="15.5" width="5" height="1.5" rx="0.75" fill="rgba(255,255,255,0.65)"/></svg>,
                'My Loans': <svg width="15" height="15" viewBox="0 0 24 24"><rect x="2" y="13" width="5" height="9" rx="1.5" fill="currentColor" opacity="0.45"/><rect x="9.5" y="8" width="5" height="14" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="17" y="3" width="5" height="19" rx="1.5" fill="currentColor"/></svg>,
                'Friends': <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="8.5" cy="6.5" r="4"/><path d="M0 21c0-5 3.8-8 8.5-8s8.5 3 8.5 8H0z"/><circle cx="19" cy="7.5" r="3" opacity="0.55"/><path d="M14.5 21c0-3.5 2-5.5 4.5-5.5S24 17.5 24 21h-9.5" opacity="0.55"/></svg>,
                'Recent Activity': <svg width="15" height="15" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M12 6.5v5.5l3.5 2.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
                'Documents': <svg width="15" height="15" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor"/><path d="M14 2v6h6" fill="rgba(0,0,0,0.2)"/><line x1="8" y1="13" x2="16" y2="13" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><line x1="8" y1="17" x2="16" y2="17" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><line x1="8" y1="9" x2="11" y2="9" stroke="white" strokeWidth="1.6" strokeLinecap="round"/></svg>,
                };
                return (
                  <Link key={label} to={to} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#1A1918' : '#787776',
                    background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                    fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
                  }}>
                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: isActive ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{navIcons[label]}</span>
                    {label}
                  </Link>
                );
              })}
              {/* Coming Soon section */}
              <div style={{ marginTop: 16, marginBottom: 4, paddingLeft: 12 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Coming Soon</span>
              </div>
              {[
                { label: 'Learn', to: createPageUrl("ComingSoon") },
                { label: 'Loan Help', to: createPageUrl("LoanHelp") },
              ].map(({ label, to }) => {
                const soonIcons = {
                'Learn': <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" opacity="0.8"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
                'Loan Help': <svg width="15" height="15" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/><circle cx="12" cy="17" r="1" fill="white"/></svg>,
                };
                return (
                  <Link key={label} to={to} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                    fontSize: 13, fontWeight: 500, color: '#787776',
                    background: 'transparent', fontFamily: "'DM Sans', sans-serif",
                    width: '100%', boxSizing: 'border-box',
                  }}>
                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{soonIcons[label]}</span>
                    <span style={{ flex: 1 }}>{label}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'transparent', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2, flexShrink: 0 }}>SOON</span>
                  </Link>
                );
              })}
            </nav>
            <SidebarBottomSection />
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 32px 80px' }}>

          {/* Mobile-only page title (desktop shows it in top bar) */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 17, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>My Loans</div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginLeft: -32, marginRight: -32, marginBottom: 20 }} />
          </div>

          {/* Tab header */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', marginLeft: -32, marginRight: -32, paddingLeft: 32, paddingRight: 32, marginBottom: 0 }}>
            {[{key:'lending',label:'Lending'},{key:'borrowing',label:'Borrowing'},{key:'details',label:'Loan Details'}].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                position: 'relative', paddingBottom: 12,
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 17, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
                letterSpacing: '-0.02em',
                color: activeTab === tab.key ? '#1A1918' : 'rgba(0,0,0,0.30)',
                transition: 'color 0.2s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginLeft: -32, marginRight: -32, marginBottom: 20 }} />

          {/* Overdue reminder carousel */}
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
                        <div key={`reminder-${loan.id}`} style={{ minWidth: '100%', padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
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
                              {isLen ? `If they've already paid, make sure to record it.` : `If you've already paid, make sure to record the payment.`}
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
            return <PageCard title="Overdue Payments" style={{ marginBottom: 20 }}>{carouselInner}</PageCard>;
          })()}

          {activeTab === 'lending' && renderSummaryTab('lending')}
          {activeTab === 'borrowing' && renderSummaryTab('borrowing')}
          {activeTab === 'details' && renderDetailsTab()}
        </div>

      </div>

      {/* Modals */}
      {showDetailsModal && selectedLoanDetails && (
        <LoanDetailsModal loan={selectedLoanDetails.loan} type={selectedLoanDetails.type} isOpen={showDetailsModal} user={user} onCancel={() => handleCancelLoan(selectedLoanDetails.loan)} onClose={() => { setShowDetailsModal(false); setSelectedLoanDetails(null); }} />
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="rounded-2xl border-0 p-0 overflow-hidden" style={{ backgroundColor: '#fafafa' }}>
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

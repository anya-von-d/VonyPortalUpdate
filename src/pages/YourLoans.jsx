import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, User, LoanAgreement, PublicProfile } from "@/entities/all";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock, Calendar, DollarSign, FileText, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, addMonths, addWeeks, startOfMonth, endOfMonth } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import LoanDetailsModal from "@/components/loans/LoanDetailsModal";
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";
import DesktopSidebar from '../components/DesktopSidebar';
import LendingWallet from '@/components/LendingWallet';

export default function YourLoans({ defaultTab, embeddedMode }) {
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = defaultTab || searchParams.get('tab') || 'lending';
  const setActiveTab = (tab) => setSearchParams({ tab });
  const [allLoans, setAllLoans] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [loanAgreements, setLoanAgreements] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loanToCancel, setLoanToCancel] = useState(null);
  const [manageLoanSelected, setManageLoanSelected] = useState(null);
  const [rankingFilterLending, setRankingFilterLending] = useState('status');
  const [rankingFilterBorrowing, setRankingFilterBorrowing] = useState('status');
  const [activeDocPopup, setActiveDocPopup] = useState(null);
  const [docPopupAgreement, setDocPopupAgreement] = useState(null);
  const [reminderSlide, setReminderSlide] = useState(0);
  const [infoTooltip, setInfoTooltip] = useState(null);
  const [selectedScrollLoan, setSelectedScrollLoan] = useState(null);
  const [selectedWalletLoan, setSelectedWalletLoan] = useState(null);

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

  useEffect(() => {
    setSelectedScrollLoan(null);
    setSelectedWalletLoan(null);
  }, [activeTab]);

  // Keep manageLoanSelected in sync with selectedScrollLoan for doc popups
  useEffect(() => {
    setManageLoanSelected(selectedScrollLoan || null);
  }, [selectedScrollLoan]);

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

  // All manageable loans (both lending and borrowing)
  const allManageableLoans = allLoans.filter(l => l.status === 'active' || l.status === 'cancelled');

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
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.amount)}</p>
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
            <p style={{ fontSize: 13, fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif", color: '#1A1918', margin: 0 }}>{agreement.borrower_name || borrowerInfo.full_name}</p>
            {agreement.borrower_signed_date && <p style={{ fontSize: 11, color: '#787776', margin: '4px 0 0' }}>Signed {format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy')}</p>}
          </div>
          <div style={{ background: 'transparent', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)', padding: 14 }}>
            <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px' }}>Lender</p>
            <p style={{ fontSize: 13, fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif", color: '#1A1918', margin: 0 }}>{agreement.lender_name || lenderInfo.full_name}</p>
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
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.amount)}</p>
          </div>
          <div style={{ background: 'transparent', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px' }}>Total Due</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.total_amount)}</p>
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
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', margin: '0 0 12px' }}>Parties</h4>
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

  // --- Shared loan detail body (used inline below the scroll card row) ---
  const renderLoanDetailBody = (selectedLoan) => {
    const isLending = selectedLoan.lender_id === user?.id;
    const agreement = loanAgreements.find(a => a.loan_id === selectedLoan.id);
    const plannedPaymentAmount = selectedLoan.payment_amount || 0;
    const loanAnalysis = analyzeLoanPayments(selectedLoan, allPayments, agreement);
    const recalculatedPayment = loanAnalysis ? loanAnalysis.recalcPayment : 0;

    let chartData = [];
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
    const chartHeight = 110;
    const maxChartVal = Math.max(plannedPaymentAmount, ...chartData.map(d => d.amount), 1);

    const otherPartyId = isLending ? selectedLoan.borrower_id : selectedLoan.lender_id;
    const otherPartyProfile = publicProfiles.find(p => p.user_id === otherPartyId);
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
      <>
        {/* 3. Payment Progress | NP cards + Loan Terms */}
        {(() => {
          const totalOwedNow = loanAnalysis ? loanAnalysis.totalOwedNow : (selectedLoan.total_amount || selectedLoan.amount || 0);
          const totalPaidAmt = loanAnalysis ? loanAnalysis.totalPaid : (selectedLoan.amount_paid || 0);
          const loanPrincipal = selectedLoan.amount || 0;
          const totalWithInterest = loanAnalysis ? (loanAnalysis.principal + loanAnalysis.totalInterestAccrued) : (selectedLoan.total_amount || loanPrincipal);
          const paidPct = loanAnalysis ? loanAnalysis.paidPercentage : (totalWithInterest > 0 ? (totalPaidAmt / totalWithInterest) * 100 : 0);
          const nextPmtAmt = loanAnalysis ? loanAnalysis.nextPaymentAmount : (recalculatedPayment > 0 ? recalculatedPayment : (selectedLoan.payment_amount || 0));
          let nextPmtDate = null; let daysUntil = null;
          if (selectedLoan.next_payment_date) { nextPmtDate = toLocalDate(selectedLoan.next_payment_date); daysUntil = daysUntilDate(selectedLoan.next_payment_date); }
          const isLate = daysUntil !== null && daysUntil < 0;
          const dLabel = daysUntil === null ? null : isLate ? `${Math.abs(daysUntil)}d late` : daysUntil === 0 ? 'today' : `${daysUntil}d`;
          const badgeColor = isLate ? '#E8726E' : isLending ? '#03ACEA' : (daysUntil !== null && daysUntil <= 3 ? '#F59E0B' : '#9B9A98');
          const badgeBg = isLate ? 'rgba(232,114,110,0.08)' : isLending ? 'rgba(3,172,234,0.10)' : (daysUntil !== null && daysUntil <= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.04)');
          const size = 140; const dCx = size / 2; const dCy = size / 2;
          const ringR = 54; const ringStroke = 9;
          const ringCirc = 2 * Math.PI * ringR; const ringDash = (paidPct / 100) * ringCirc;
          const iconBg = isLending ? 'rgba(3,172,234,0.12)' : 'rgba(29,91,148,0.12)';
          const iconColor = isLending ? '#03ACEA' : '#1D5B94';
          const AuroraCard = ({ children }) => (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% + 10px)', height: 'calc(100% + 10px)', background: 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(6,182,212) 30%, rgb(20,184,166) 60%, rgb(3,172,234) 100%)', filter: 'blur(5px) saturate(1.2)', opacity: 0.35, borderRadius: 18, zIndex: 0, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1, flex: 1, background: 'linear-gradient(to right, rgba(3,172,234,0) 0%, #03ACEA 67%, #03ACEA 100%)', padding: 1, borderRadius: 11, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: '#ffffff' }}>
                {children}
              </div>
              </div>
            </div>
          );
          const amount = selectedLoan.amount || 0;
          const interestRate = selectedLoan.interest_rate || 0;
          const repaymentPeriod = selectedLoan.repayment_period || 0;
          const repaymentUnit = selectedLoan.repayment_unit || 'months';
          const paymentFrequency = selectedLoan.payment_frequency || 'monthly';
          const loanTermItems = [
            { label: 'Loan Amount', value: `$${amount.toLocaleString()}` },
            { label: 'Interest Rate', value: `${interestRate}%` },
            { label: 'Term', value: `${repaymentPeriod} ${repaymentUnit}` },
            { label: 'Frequency', value: paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1) },
          ];
          return (
            <>
              {/* DESKTOP: Home-style NPI/NPD card + pie Payment Progress in right column */}
              <div className="loans-detail-desktop-only" style={{ gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Home-style NPI/NPD aurora card */}
                  {(() => {
                    const auroraBg = isLending
                      ? 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(6,182,212) 30%, rgb(20,184,166) 60%, rgb(3,172,234) 100%)'
                      : 'linear-gradient(135deg, rgb(30,58,138) 0%, rgb(29,78,216) 10%, rgb(37,99,235) 20%, rgb(59,130,246) 30%, rgb(96,165,250) 40%, rgb(56,189,248) 50%, rgb(59,130,246) 60%, rgb(37,99,235) 70%, rgb(29,78,216) 80%, rgb(30,64,175) 90%, rgb(37,99,235) 100%)';
                    const auroraOpacity = isLending ? 0.35 : 0.45;
                    const otherFirstName = (otherPartyUsername || 'User').split(' ')[0];
                    return (
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'calc(100% + 10px)', height: 'calc(100% + 10px)', background: auroraBg, filter: 'blur(5px) saturate(1.2)', opacity: auroraOpacity, borderRadius: 18, zIndex: 0, pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', zIndex: 1, flex: 1, padding: '12px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(50,138,182,0.65)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          {dLabel && nextPmtDate && (
                            <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 4, padding: '2px 5px', lineHeight: 1.2 }}>{dLabel}</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingBottom: 5, marginBottom: 2 }}>
                            <span style={{ width: 20, height: 20, borderRadius: 6, background: '#EBF4FA', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {isLending
                                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><polyline points="19 12 12 19 5 12"/></svg>
                                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg>
                              }
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{isLending ? 'Next Payment Incoming' : 'Next Payment Due'}</span>
                          </div>
                          {nextPmtDate ? (
                            <>
                              <div style={{ textAlign: 'center', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {isLending ? (
                                  <>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', marginRight: 4 }}>{formatMoney(nextPmtAmt)}</span>
                                    <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1918' }}>from {otherFirstName}</span>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#03ACEA', letterSpacing: '-0.02em', marginRight: 6, background: '#EBF4FA', padding: '2px 7px', borderRadius: 5, display: 'inline-block' }}>{formatMoney(nextPmtAmt)}</span>
                                    <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1918' }}>to {otherFirstName}</span>
                                  </>
                                )}
                              </div>
                              <div style={{ textAlign: 'left', marginTop: 6, fontSize: 8, fontWeight: 700, color: '#03ACEA', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                                {isLending ? 'Expect before' : 'Send before'} {format(nextPmtDate, 'MMMM do')}
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 15, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                              <span style={{ fontSize: 11, color: '#9B9A98' }}>{isLending ? 'None incoming ✨' : 'Nothing due 🎉'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <PageCard title="Loan Terms" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {loanTermItems.map((item, idx) => (<div key={idx} style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p><p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p></div>))}
                    </div>
                  </PageCard>
                </div>
                {(() => {
                  const percentPaid = totalOwedBorrowing > 0 ? Math.round((totalPaidBorrowing / totalOwedBorrowing) * 100) : 0;
                  const percentRepaid = totalExpectedLending > 0 ? Math.round((totalReceivedLending / totalExpectedLending) * 100) : 0;
                  const borrowOwed = Math.max(0, totalOwedBorrowing - totalPaidBorrowing);
                  const lentOwed = Math.max(0, totalExpectedLending - totalReceivedLending);
                  const Ring = ({ percent, color, label }) => {
                    const C = 2 * Math.PI * 45;
                    const offset = C - (percent / 100) * C;
                    return (
                      <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
                        <svg width="68" height="68" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="64" cy="64" r="45" fill="none" stroke={`${color}26`} strokeWidth="10" />
                          <circle cx="64" cy="64" r="45" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 1 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>{percent}%</span>
                          <span style={{ fontSize: 8, fontWeight: 500, color: '#787776', fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>{label}</span>
                        </div>
                      </div>
                    );
                  };
                  const textBlockStyle = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 };
                  const bigLineStyle = { fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" };
                  const subLineStyle = { fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" };
                  return (
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
                      <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', padding: '14px 18px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', marginBottom: 8, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em' }}>Overview</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                          <Ring percent={percentPaid} color="#1D5B94" label="Paid back" />
                          <div style={textBlockStyle}>
                            <div style={bigLineStyle}>You owe <span style={{ color: '#1D5B94' }}>{formatMoney(borrowOwed)}</span></div>
                            <div style={subLineStyle}>{formatMoney(totalPaidBorrowing)} of {formatMoney(totalOwedBorrowing)} paid back</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
                          <Ring percent={percentRepaid} color="#03ACEA" label="Repaid" />
                          <div style={textBlockStyle}>
                            <div style={bigLineStyle}>You're owed <span style={{ color: '#03ACEA' }}>{formatMoney(lentOwed)}</span></div>
                            <div style={subLineStyle}>{formatMoney(totalReceivedLending)} of {formatMoney(totalExpectedLending)} repaid to you</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* MOBILE: Home-style NPI/NPD aurora card + Loan Terms */}
              <div className="loans-detail-mobile-only">
                {/* Home-style NPI/NPD aurora card */}
                {(() => {
                  const auroraBg = isLending
                    ? 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(6,182,212) 30%, rgb(20,184,166) 60%, rgb(3,172,234) 100%)'
                    : 'linear-gradient(135deg, rgb(30,58,138) 0%, rgb(29,78,216) 10%, rgb(37,99,235) 20%, rgb(59,130,246) 30%, rgb(96,165,250) 40%, rgb(56,189,248) 50%, rgb(59,130,246) 60%, rgb(37,99,235) 70%, rgb(29,78,216) 80%, rgb(30,64,175) 90%, rgb(37,99,235) 100%)';
                  const auroraOpacity = isLending ? 0.35 : 0.45;
                  const otherFirstName = (otherPartyUsername || 'User').split(' ')[0];
                  return (
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'calc(100% + 10px)', height: 'calc(100% + 10px)', background: auroraBg, filter: 'blur(5px) saturate(1.2)', opacity: auroraOpacity, borderRadius: 18, zIndex: 0, pointerEvents: 'none' }} />
                      <div style={{ position: 'relative', zIndex: 1, flex: 1, padding: '12px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(50,138,182,0.65)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {dLabel && nextPmtDate && (
                          <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 4, padding: '2px 5px', lineHeight: 1.2 }}>{dLabel}</span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingBottom: 5, marginBottom: 2 }}>
                          <span style={{ width: 20, height: 20, borderRadius: 6, background: '#EBF4FA', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isLending
                              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><polyline points="19 12 12 19 5 12"/></svg>
                              : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg>
                            }
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{isLending ? 'Next Payment Incoming' : 'Next Payment Due'}</span>
                        </div>
                        {nextPmtDate ? (
                          <>
                            <div style={{ textAlign: 'center', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {isLending ? (
                                <>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', marginRight: 4 }}>{formatMoney(nextPmtAmt)}</span>
                                  <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1918' }}>from {otherFirstName}</span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: '#03ACEA', letterSpacing: '-0.02em', marginRight: 6, background: '#EBF4FA', padding: '2px 7px', borderRadius: 5, display: 'inline-block' }}>{formatMoney(nextPmtAmt)}</span>
                                  <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1918' }}>to {otherFirstName}</span>
                                </>
                              )}
                            </div>
                            <div style={{ textAlign: 'left', marginTop: 6, fontSize: 8, fontWeight: 700, color: '#03ACEA', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                              {isLending ? 'Expect before' : 'Send before'} {format(nextPmtDate, 'MMMM do')}
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                            <span style={{ fontSize: 11, color: '#9B9A98' }}>{isLending ? 'None incoming ✨' : 'Nothing due 🎉'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                <PageCard title="Loan Terms" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {loanTermItems.map((item, idx) => (<div key={idx} style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p><p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p></div>))}
                  </div>
                </PageCard>
              </div>
            </>
          );
        })()}

        {/* 2-col masonry: left = Payment History + Docs, right = Payments */}
        <div className="loan-details-masonry" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageCard title="Payment History">
          <div>
          {chartData.length === 0 ? (
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

        <div className="loan-details-doc-boxes" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ background: '#1A1918', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px' }}>
                <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === selectedLoan.id); if (ag) openDocPopup('promissory', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
            <div style={{ position: 'relative' }}>
              <div style={{ background: '#1A1918', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px' }}>
                <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === selectedLoan.id); if (ag) openDocPopup('amortization', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#1A1918', borderRadius: 10, display: 'inline-flex', alignItems: 'center', padding: '9px 14px' }}>
              <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === selectedLoan.id); if (ag) openDocPopup('summary', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, whiteSpace: 'nowrap' }}>Loan Summary</p>
              </button>
            </div>
          </div>
        </div>
        </div>{/* end left column */}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageCard title="Payments">
          <div>
          {(() => {
            const paymentAmt = selectedLoan.payment_amount || 0;
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
                  return (
                    <div key={row.number} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, background: 'transparent' }}>
                      <PieCircle percentage={row.paidPercentage} number={row.number} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#4B4A48', margin: 0 }}>Amount Due for Payment {row.number}: ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        {row.status === 'partial' && row.paidAmount > 0 && (
                          <p style={{ fontSize: 12, margin: '1px 0 0' }}>
                            <span style={{ fontWeight: 700, color: '#15803D' }}>Paid: ${row.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span style={{ color: '#9B9A98', margin: '0 6px' }}>·</span>
                            <span style={{ fontWeight: 600, color: '#03ACEA' }}>Remaining: ${Math.max(0, row.amount - row.paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </p>
                        )}
                        {row.status !== 'partial' && row.paidAmount > 0 && <p style={{ fontSize: 12, fontWeight: 700, color: '#15803D', margin: '1px 0 0' }}>Paid: ${row.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
                        <p style={{ fontSize: 11, color: '#4B4A48', margin: '1px 0 0' }}>Due: {format(row.date, 'MMM d, yyyy')}</p>
                      </div>
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
            const ag = loanAgreements.find(a => a.loan_id === selectedLoan.id);
            const loanPmts = allPayments.filter(p => p.loan_id === selectedLoan.id);
            const lenderProfile = publicProfiles.find(p => p.user_id === selectedLoan.lender_id);
            const borrowerProfile = publicProfiles.find(p => p.user_id === selectedLoan.borrower_id);
            const lenderName = lenderProfile?.full_name || 'lender';
            const borrowerName = borrowerProfile?.full_name || 'borrower';
            const activities = [];
            if (selectedLoan.created_at) activities.push({ timestamp: new Date(selectedLoan.created_at), type: 'created', description: `Loan created between ${borrowerName} and ${lenderName}` });
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
            if (selectedLoan.status === 'completed') activities.push({ timestamp: new Date(), type: 'completion', description: 'Loan repaid in full' });
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
            const repaymentPeriod = selectedLoan.repayment_period || 0;
            const paymentFrequency = selectedLoan.payment_frequency || 'monthly';
            const totalOwedDisplay = loanAnalysis ? loanAnalysis.totalOwedNow : (selectedLoan.total_amount || selectedLoan.amount || 0);
            const amountPaidDisplay = loanAnalysis ? loanAnalysis.totalPaid : (selectedLoan.amount_paid || 0);
            const fullPayments = loanAnalysis ? loanAnalysis.fullPaymentCount : 0;
            const paymentAmountDisplay = loanAnalysis ? loanAnalysis.nextPaymentAmount : (recalculatedPayment > 0 ? recalculatedPayment : (selectedLoan.payment_amount || 0));
            const freqLabel = paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1);
            const lpItems = [
              { label: isLending ? 'Total Owed to You' : 'Total Owed', value: `$${totalOwedDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'with interest' },
              { label: isLending ? 'Amount Received' : 'Amount Paid', value: `$${amountPaidDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: null },
              { label: 'Payments Made', value: `${fullPayments}/${repaymentPeriod}`, sub: 'full payments' },
              { label: `${freqLabel} Payments`, value: `$${paymentAmountDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: isLending ? `from ${otherPartyUsername}` : `to ${otherPartyUsername}` },
            ];
            return (
              <div className="loan-progress-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {lpItems.map((item, idx) => (<div key={idx} style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p><p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p>{item.sub && <p style={{ fontSize: 9, color: '#787776', marginTop: 2 }}>{item.sub}</p>}</div>))}
              </div>
            );
          })()}
          </div>
        </PageCard>
        </div>{/* end Activity | Loan Progress row */}

        {/* Cancelled notice */}
        {selectedLoan.status === 'cancelled' && (
          <div className="bg-red-50 rounded-xl px-4 py-3 shadow-sm border border-red-200"><p className="text-sm text-red-600 font-medium">This loan has been cancelled.</p></div>
        )}
      </>
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
    const barBg = '#D9EAF4';

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
        {/* Desktop: wallet in col 1 | stacked (NPI + Upcoming + Active Summary) in col 2 */}
        <div className="loans-top-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>

          {/* COL 1: Wallet — standalone, no outer white box */}
          {(() => {
            const lendLoans = activeLendingLoans;
            const borrowLns = activeBorrowingLoans;
            const totalLentAmount = lendLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
            const totalRepaid = lendLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);
            const totalBorrowedAmt = borrowLns.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
            const totalPaidBackAmt = borrowLns.reduce((s, l) => s + (l.amount_paid || 0), 0);
            const lentOwed = Math.max(0, totalLentAmount - totalRepaid);
            const borrowOwedAmt = Math.max(0, totalBorrowedAmt - totalPaidBackAmt);

            const sourceLoans = isLending ? lendLoans : borrowLns;
            const otherKey = isLending ? 'borrower_id' : 'lender_id';
            const walletCards = [...sourceLoans]
              .map(l => {
                const profile = publicProfiles.find(p => p.user_id === l[otherKey]);
                const firstName = profile?.full_name?.split(' ')[0] || profile?.username || 'User';
                const remaining = Math.max(0, (l.total_amount || l.amount || 0) - (l.amount_paid || 0));
                return { id: l.id, name: firstName, amount: remaining, purpose: l.purpose };
              })
              .sort((a, b) => b.amount - a.amount);

            return (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <LendingWallet
                  cards={walletCards}
                  summaryCard={{
                    label: isLending ? "You're owed" : 'You owe',
                    amount: formatMoney(isLending ? lentOwed : borrowOwedAmt),
                    sublabel: `across ${sourceLoans.length} loan${sourceLoans.length !== 1 ? 's' : ''}`,
                  }}
                  onCardClick={(id) => {
                    if (id === 'summary') {
                      setSelectedWalletLoan(null);
                    } else {
                      const found = sourceLoans.find(l => l.id === id);
                      setSelectedWalletLoan(found || null);
                    }
                  }}
                  selectedId={selectedWalletLoan?.id || 'summary'}
                  isLending={isLending}
                />
              </div>
            );
          })()}

          {/* COL 2: loan detail when a wallet card is selected, else 2×2 summary grid */}
          <div>
          {/* ── Wallet-selected loan detail panel ── */}
          {selectedWalletLoan && (() => {
            const detailProfile = publicProfiles.find(p => p.user_id === (isLending ? selectedWalletLoan.borrower_id : selectedWalletLoan.lender_id));
            const detailFullName = detailProfile?.full_name || 'User';
            const detailAmt = selectedWalletLoan.total_amount || selectedWalletLoan.amount || 0;
            const detailPurpose = selectedWalletLoan.purpose;
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                    {isLending ? 'You lent' : 'You borrowed'}{' '}
                    {formatMoney(detailAmt)}{' '}
                    {isLending ? 'to' : 'from'}{' '}
                    {detailFullName}
                    {detailPurpose && (
                      <span style={{ fontWeight: 400, color: '#787776' }}> · {detailPurpose}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedWalletLoan(null)}
                    style={{
                      background: 'none', border: '1px solid rgba(0,0,0,0.12)',
                      borderRadius: 8, cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, color: '#787776',
                      fontFamily: "'DM Sans', sans-serif",
                      padding: '4px 10px', flexShrink: 0, marginLeft: 12,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    ← Summary
                  </button>
                </div>
                {renderLoanDetailBody(selectedWalletLoan)}
              </div>
            );
          })()}
          {/* ── Default 2×2 summary grid ── */}
          {!selectedWalletLoan && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Row 1 Col 1: Next Payment Incoming / Due */}
          {(() => {
            const auroraBg = isLending
              ? 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(6,182,212) 30%, rgb(20,184,166) 60%, rgb(3,172,234) 100%)'
              : 'linear-gradient(135deg, rgb(30,58,138) 0%, rgb(29,78,216) 10%, rgb(37,99,235) 20%, rgb(59,130,246) 30%, rgb(96,165,250) 40%, rgb(56,189,248) 50%, rgb(59,130,246) 60%, rgb(37,99,235) 70%, rgb(29,78,216) 80%, rgb(30,64,175) 90%, rgb(37,99,235) 100%)';
            const auroraOpacity = isLending ? 0.35 : 0.45;
            const otherFirstName = otherPartyUsername ? String(otherPartyUsername).split(' ')[0] : 'User';
            return (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Aurora glow */}
                <div style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 'calc(100% + 10px)',
                  height: 'calc(100% + 10px)',
                  background: auroraBg,
                  filter: 'blur(5px) saturate(1.2)',
                  opacity: auroraOpacity,
                  borderRadius: 18,
                  zIndex: 0,
                  pointerEvents: 'none',
                }} />
                {/* Card */}
                <div style={{
                  position: 'relative', zIndex: 1, flex: 1,
                  padding: '12px 14px', borderRadius: 10,
                  background: '#ffffff',
                  border: '1px solid rgba(50,138,182,0.65)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  {daysLabel && nextPaymentLoan && (
                    <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 4, padding: '2px 5px', lineHeight: 1.2 }}>{daysLabel}</span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingBottom: 5, marginBottom: 2 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: '#EBF4FA', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isLending
                        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><polyline points="19 12 12 19 5 12"/></svg>
                        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg>
                      }
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>
                      {isLending ? 'Next Payment Incoming' : 'Next Payment Due'}
                    </span>
                  </div>
                  {nextPaymentLoan ? (
                    <>
                      <div style={{ textAlign: 'center', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isLending ? (
                          <>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', marginRight: 4 }}>
                              {formatMoney(nextPaymentAmount)}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1918' }}>from {otherFirstName}</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#03ACEA', letterSpacing: '-0.02em', marginRight: 6, background: '#EBF4FA', padding: '2px 7px', borderRadius: 5, display: 'inline-block' }}>
                              {formatMoney(nextPaymentAmount)}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1918' }}>to {otherFirstName}</span>
                          </>
                        )}
                      </div>
                      <div style={{ textAlign: 'left', marginTop: 6, fontSize: 8, fontWeight: 700, color: '#03ACEA', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                        {isLending ? 'Expect before' : 'Send before'} {format(new Date(nextPaymentLoan.next_payment_date), 'MMMM do')}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                      <span style={{ fontSize: 11, color: '#9B9A98' }}>{isLending ? 'None incoming ✨' : 'Nothing due 🎉'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}


        {/* Row 1 Col 2: Overview — only the ring relevant to current tab */}
        {(() => {
          const percentPaid   = totalOwedBorrowing   > 0 ? Math.round((totalPaidBorrowing   / totalOwedBorrowing)   * 100) : 0;
          const percentRepaid = totalExpectedLending > 0 ? Math.round((totalReceivedLending / totalExpectedLending) * 100) : 0;
          const borrowOwed = Math.max(0, totalOwedBorrowing   - totalPaidBorrowing);
          const lentOwed   = Math.max(0, totalExpectedLending - totalReceivedLending);
          const OvRing = ({ percent, color, label }) => {
            const C = 2 * Math.PI * 45; const offset = C - (percent / 100) * C;
            return (
              <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                <svg width="60" height="60" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="64" cy="64" r="45" fill="none" stroke={`${color}26`} strokeWidth="10" />
                  <circle cx="64" cy="64" r="45" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>{percent}%</span>
                  <span style={{ fontSize: 7, fontWeight: 500, color: '#787776', fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>{label}</span>
                </div>
              </div>
            );
          };
          const paymentsLeft = activeLoans.reduce((s, l) => {
            const paidCount = (l.payment_amount || 0) > 0 ? Math.floor((l.amount_paid || 0) / (l.payment_amount)) : 0;
            return s + Math.max(0, (l.repayment_period || 0) - paidCount);
          }, 0);
          const tbS = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 };
          const bL  = { fontSize: 11, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em' };
          const sL  = { fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" };
          return (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>Overview</div>
                {isLending ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <OvRing percent={percentRepaid} color="#03ACEA" label="Repaid" />
                    <div style={tbS}>
                      <div style={bL}>{formatMoney(totalReceivedLending)} <span style={{ color: '#03ACEA' }}>of {formatMoney(totalExpectedLending)}</span> repaid</div>
                      <div style={sL}>{paymentsLeft} payment{paymentsLeft !== 1 ? 's' : ''} left</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <OvRing percent={percentPaid} color="#1D5B94" label="Paid back" />
                    <div style={tbS}>
                      <div style={bL}>{formatMoney(totalPaidBorrowing)} <span style={{ color: '#1D5B94' }}>of {formatMoney(totalOwedBorrowing)}</span> paid back</div>
                      <div style={sL}>{paymentsLeft} payment{paymentsLeft !== 1 ? 's' : ''} left</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Row 2: Upcoming + Active Summary as direct grid children */}
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
            <>
              <PageCard tone={isLending ? 'lending' : 'borrowing'} title="Upcoming" headerRight={<Link to={createPageUrl("Upcoming")} style={{ fontSize: 11, fontWeight: 500, color: isLending ? '#03ACEA' : '#1D5B94', textDecoration: 'none' }}>Full schedule →</Link>} style={{ marginBottom: 0 }}>
                {combinedLoans.length === 0 ? (
                  <div style={{ padding: '10px 0', fontSize: 13, color: '#9B9A98', textAlign: 'center' }}>You're all clear! Nothing coming up yet 🎉</div>
                ) : combinedLoans.map((loan) => {
                  const isOverdue = loan.days < 0;
                  const daysLbl = isOverdue ? `${Math.abs(loan.days)}d late` : loan.days === 0 ? 'today' : `${loan.days}d`;
                  const amtSign = isLending ? '+' : '-';
                  return (
                    <div key={loan.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0' }}>
                      <div style={{
                        flexShrink: 0, alignSelf: 'center',
                        fontSize: 10, fontWeight: 700, lineHeight: 1.2,
                        color: isOverdue ? '#E8726E' : loan.days <= 3 ? '#F59E0B' : '#9B9A98',
                        background: isOverdue ? 'rgba(232,114,110,0.08)' : loan.days <= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.04)',
                        borderRadius: 6, padding: '2px 5px',
                      }}>
                        {daysLbl}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', marginRight: 4 }}>
                            {formatMoney(loan.payment_amount || 0)}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1918' }}>
                            {isOverdue
                              ? (isLending ? `from ${loan.firstName} is overdue` : `to ${loan.firstName} is overdue`)
                              : (isLending ? `due from ${loan.firstName}` : `due to ${loan.firstName}`)
                            }
                          </span>
                        </div>
                        {loan.purpose && (
                          <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {loan.purpose}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </PageCard>

              {/* Your Lending / Your Borrowing summary */}
              {activeLoans.length > 0 && (() => {
                const tone = isLending ? 'lending' : 'borrowing';
                const titleStr = isLending ? 'Your Lending' : 'Your Borrowing';
                const accent = isLending ? '#03ACEA' : '#1D5B94';
                const accentBg = isLending ? 'rgba(3,172,234,0.10)' : 'rgba(29,91,148,0.10)';

                const sortedLoans = [...activeLoans].sort((a, b) => {
                  if (rankingFilter === 'status') {
                    const aOv = a.next_payment_date && new Date(a.next_payment_date) < new Date();
                    const bOv = b.next_payment_date && new Date(b.next_payment_date) < new Date();
                    if (aOv && !bOv) return -1; if (!aOv && bOv) return 1; return 0;
                  }
                  if (rankingFilter === 'highest_interest') return (b.interest_rate || 0) - (a.interest_rate || 0);
                  if (rankingFilter === 'lowest_interest') return (a.interest_rate || 0) - (b.interest_rate || 0);
                  if (rankingFilter === 'highest_payment') return (b.payment_amount || 0) - (a.payment_amount || 0);
                  if (rankingFilter === 'lowest_payment') return (a.payment_amount || 0) - (b.payment_amount || 0);
                  if (rankingFilter === 'soonest_deadline') { const dA = a.next_payment_date ? new Date(a.next_payment_date) : new Date('2099-01-01'); const dB = b.next_payment_date ? new Date(b.next_payment_date) : new Date('2099-01-01'); return dA - dB; }
                  if (rankingFilter === 'largest_amount') return (b.total_amount || b.amount || 0) - (a.total_amount || a.amount || 0);
                  if (rankingFilter === 'smallest_amount') return (a.total_amount || a.amount || 0) - (b.total_amount || b.amount || 0);
                  if (rankingFilter === 'most_repaid') { const pA = (a.total_amount||a.amount||0)>0?(a.amount_paid||0)/(a.total_amount||a.amount||1):0; const pB = (b.total_amount||b.amount||0)>0?(b.amount_paid||0)/(b.total_amount||b.amount||1):0; return pB-pA; }
                  if (rankingFilter === 'least_repaid') { const pA = (a.total_amount||a.amount||0)>0?(a.amount_paid||0)/(a.total_amount||a.amount||1):0; const pB = (b.total_amount||b.amount||0)>0?(b.amount_paid||0)/(b.total_amount||b.amount||1):0; return pA-pB; }
                  if (rankingFilter === 'most_recent') return new Date(b.created_at) - new Date(a.created_at);
                  return 0;
                });

                return (
                  <PageCard tone={tone} title={titleStr} style={{ marginBottom: 0 }} headerRight={
                    <Select value={rankingFilter} onValueChange={setRankingFilter}>
                      <SelectTrigger className="w-auto h-7 px-2 border-0 text-xs font-medium rounded-lg" style={{ background: accentBg, color: accent }}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="highest_interest">Highest Interest Rate</SelectItem>
                        <SelectItem value="lowest_interest">Lowest Interest Rate</SelectItem>
                        <SelectItem value="highest_payment">Highest Payment</SelectItem>
                        <SelectItem value="lowest_payment">Lowest Payment</SelectItem>
                        <SelectItem value="soonest_deadline">Soonest Deadline</SelectItem>
                        <SelectItem value="largest_amount">Largest Amount</SelectItem>
                        <SelectItem value="smallest_amount">Smallest Amount</SelectItem>
                        <SelectItem value="most_repaid">Most Repaid</SelectItem>
                        <SelectItem value="least_repaid">Least Repaid</SelectItem>
                        <SelectItem value="most_recent">Most Recently Created</SelectItem>
                      </SelectContent>
                    </Select>
                  }>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {sortedLoans.slice(0, 5).map((loan) => {
                        const otherUserId = isLending ? loan.borrower_id : loan.lender_id;
                        const op = publicProfiles.find(p => p.user_id === otherUserId);
                        const name = op?.full_name?.split(' ')[0] || op?.username || 'User';
                        const totalAmt = loan.total_amount || loan.amount || 0;
                        const paidAmt = loan.amount_paid || 0;
                        const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                        const isOverdue = loan.next_payment_date && new Date(loan.next_payment_date) < new Date();
                        const overdueAmt = isOverdue ? (loan.payment_amount || 0) : 0;

                        // Right-side label with context
                        let badgeLabel = '';
                        let badgeColor = accent;
                        let badgeBg = accentBg;
                        if (rankingFilter === 'status') {
                          badgeLabel = isOverdue ? `${formatMoney(overdueAmt)} overdue` : 'On track';
                          badgeColor = isOverdue ? '#E8726E' : accent;
                          badgeBg = isOverdue ? 'rgba(232,114,110,0.08)' : accentBg;
                        } else if (rankingFilter === 'highest_interest' || rankingFilter === 'lowest_interest') {
                          badgeLabel = `${loan.interest_rate || 0}% interest`;
                        } else if (rankingFilter === 'highest_payment' || rankingFilter === 'lowest_payment') {
                          badgeLabel = `${formatMoney(loan.payment_amount || 0)}/period`;
                        } else if (rankingFilter === 'soonest_deadline') {
                          const d = loan.next_payment_date ? daysUntilDate(loan.next_payment_date) : null;
                          badgeLabel = d === null ? '—' : d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `${d}d`;
                          if (d !== null && d < 0) { badgeColor = '#E8726E'; badgeBg = 'rgba(232,114,110,0.08)'; }
                        } else if (rankingFilter === 'largest_amount' || rankingFilter === 'smallest_amount') {
                          badgeLabel = `${formatMoney(totalAmt)} total`;
                        } else if (rankingFilter === 'most_repaid' || rankingFilter === 'least_repaid') {
                          badgeLabel = `${pct}% repaid`;
                        } else if (rankingFilter === 'most_recent') {
                          badgeLabel = loan.created_at ? format(new Date(loan.created_at), 'MMM d') : '—';
                        }

                        return (
                          <div key={loan.id} style={{ padding: '9px 0' }}>
                            {/* Line 1: name | badge */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {name}
                              </span>
                              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 5, padding: '2px 6px', lineHeight: 1.2 }}>
                                {badgeLabel}
                              </span>
                            </div>
                            {/* Line 2: context sentence */}
                            <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isLending
                                ? `Borrowed ${formatMoney(totalAmt)} from you${loan.purpose ? ` for ${loan.purpose}` : ''}`
                                : `Lent you ${formatMoney(totalAmt)}${loan.purpose ? ` for ${loan.purpose}` : ''}`
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </PageCard>
                );
              })()}
            </>
          );
        })()}
          </div>
          )}{/* end !selectedWalletLoan grid */}
          </div>{/* end col 2 wrapper */}
        </div>{/* end loans-top-layout grid */}


      </>
    );
  };


  const LENDER_GREEN = '#03ACEA';

  const PageCard = ({ title, headerRight, children, style, highlight, tone }) => {
    const toneCfg = tone === 'lending'
      ? { aura: '#B8E4F7', border: 'rgba(3,172,234,0.35)', bg: '#F5FBFE' }
      : tone === 'borrowing'
      ? { aura: '#B7C8E3', border: 'rgba(29,91,148,0.35)', bg: '#F4F7FC' }
      : { aura: '#CFDCE7', border: 'rgba(207,220,231,0.6)', bg: '#ffffff' };
    return (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: toneCfg.aura, borderRadius: 12, filter: 'blur(4px)', opacity: 0.55, zIndex: 0, pointerEvents: 'none' }} />
    <div style={{
      position: 'relative', zIndex: 1,
      background: toneCfg.bg,
      backdropFilter: 'blur(12px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
      borderRadius: 10,
      border: highlight ? '1px solid rgba(3,172,234,0.25)' : `1px solid ${toneCfg.border}`,
      padding: '14px 18px',
      ...style
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5, marginBottom: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: highlight ? '#03ACEA' : '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
      <div style={{ overflow: 'visible', ...(highlight ? { display: 'flex', flexDirection: 'column' } : {}) }}>
        {children}
      </div>
    </div>
    </div>
    );
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 12, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading your loans...</p>
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

  if (embeddedMode) {
    return (
      <>
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

        <div style={{ padding: '0 0 40px' }}>
          {activeTab === 'lending' && renderSummaryTab('lending')}
          {activeTab === 'borrowing' && renderSummaryTab('borrowing')}
        </div>

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
      </>
    );
  }

  return (
    <>
      <MeshMobileNav user={user} activePage={defaultTab === 'lending' ? 'Lending' : defaultTab === 'borrowing' ? 'Borrowing' : 'My Loans'} />
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
        <DesktopSidebar />

        {/* ── CENTER ── */}
        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 32px 80px' }}>

          {/* Mobile-only page title */}
          {!defaultTab ? (
          <div className="mobile-page-title">
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', marginBottom: 0 }}>
              {[{key:'lending',label:'Lending'},{key:'borrowing',label:'Borrowing'}].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  paddingBottom: 10, border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '-0.02em',
                  color: activeTab === tab.key ? '#1A1918' : 'rgba(0,0,0,0.28)',
                  transition: 'color 0.2s',
                }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          ) : (
          <div className="mobile-page-title">
            <div style={{ paddingBottom: 10, marginBottom: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.02em', color: '#1A1918' }}>
                {defaultTab === 'lending' ? 'Lending' : 'Borrowing'}
              </span>
            </div>
          </div>
          )}


          {activeTab === 'lending' && renderSummaryTab('lending')}
          {activeTab === 'borrowing' && renderSummaryTab('borrowing')}
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

    </>
  );
}

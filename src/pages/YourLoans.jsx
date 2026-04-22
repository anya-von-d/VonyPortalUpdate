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
import LoanTimeline from '@/components/LoanTimeline';

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
        {/* Loan detail header */}
        {(() => {
          const totalPaidAmt = loanAnalysis ? loanAnalysis.totalPaid : (selectedLoan.amount_paid || 0);
          const totalWithInterest = loanAnalysis ? (loanAnalysis.principal + loanAnalysis.totalInterestAccrued) : (selectedLoan.total_amount || selectedLoan.amount || 0);
          const paidPct = Math.round(totalWithInterest > 0 ? Math.min(100, (totalPaidAmt / totalWithInterest) * 100) : 0);
          const remaining = Math.max(0, totalWithInterest - totalPaidAmt);
          const ringColor = isLending ? '#03ACEA' : '#1D5B94';
          const cardBase = { background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 12px' };
          const C = 2 * Math.PI * 45; const ringOffset = C - (paidPct / 100) * C;
          const interestRate = selectedLoan.interest_rate || 0;
          const repaymentPeriod = selectedLoan.repayment_period || 0;
          const repaymentUnit = selectedLoan.repayment_unit || 'months';
          const paymentFrequency = selectedLoan.payment_frequency || 'monthly';
          return (
            <>
              {/* Compact loan-with bar — centered, fit to content */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <div style={{ background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '9px 16px', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${ringColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {otherPartyProfile?.avatar_url || otherPartyProfile?.profile_picture_url
                      ? <img src={otherPartyProfile.avatar_url || otherPartyProfile.profile_picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 13, fontWeight: 700, color: ringColor, fontFamily: "'DM Sans', sans-serif" }}>{otherPartyUsername.charAt(0)}</span>
                    }
                  </div>
                  <div style={{ fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600 }}>{otherPartyUsername}</span>
                    {isLending ? ' borrowed ' : ' lent you '}
                    <span style={{ fontWeight: 700, color: ringColor }}>{formatMoney(selectedLoan.amount || 0)}</span>
                    {selectedLoan.purpose ? <> for <span style={{ color: '#787776' }}>{selectedLoan.purpose}</span></> : null}
                  </div>
                </div>
              </div>

              {/* [2fr: Loan Terms + Docs] [1fr: You're Owed + Repayment Progress] */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20, alignItems: 'stretch' }}>

                {/* Left (2fr): Loan Terms full-width, then doc buttons below */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Loan Terms */}
                  <div style={{ ...cardBase }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>Loan Terms</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[
                        { label: 'Loan Amount', value: formatMoney(selectedLoan.amount || 0) },
                        { label: 'Interest Rate', value: `${interestRate}%` },
                        { label: 'Term', value: `${repaymentPeriod} ${repaymentUnit}` },
                        { label: 'Frequency', value: paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1) },
                      ].map((item, idx) => (
                        <div key={idx} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2, fontFamily: "'DM Sans', sans-serif" }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Blue doc buttons — horizontal row, centered, fit to text */}
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ background: '#03ACEA', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px' }}>
                        <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === selectedLoan.id); if (ag) openDocPopup('promissory', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, whiteSpace: 'nowrap' }}>Promissory Note</p>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setInfoTooltip(infoTooltip === 'promissory' ? null : 'promissory'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 800, color: 'white', lineHeight: 1 }}>i</span></span>
                        </button>
                      </div>
                      {infoTooltip === 'promissory' && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 9, padding: '8px 11px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)', width: 200, zIndex: 200, border: '1px solid rgba(0,0,0,0.06)' }}>
                          <p style={{ fontSize: 11, color: '#1A1918', margin: 0, lineHeight: 1.55 }}>A signed legal document where the borrower promises to repay a specific amount under agreed terms.</p>
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <div style={{ background: '#03ACEA', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px' }}>
                        <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === selectedLoan.id); if (ag) openDocPopup('amortization', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, whiteSpace: 'nowrap' }}>Amortization Schedule</p>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setInfoTooltip(infoTooltip === 'amortization' ? null : 'amortization'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 800, color: 'white', lineHeight: 1 }}>i</span></span>
                        </button>
                      </div>
                      {infoTooltip === 'amortization' && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 9, padding: '8px 11px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)', width: 200, zIndex: 200, border: '1px solid rgba(0,0,0,0.06)' }}>
                          <p style={{ fontSize: 11, color: '#1A1918', margin: 0, lineHeight: 1.55 }}>A table showing each scheduled payment broken down into principal and interest over the life of the loan.</p>
                        </div>
                      )}
                    </div>
                    <div style={{ background: '#03ACEA', borderRadius: 10, display: 'inline-flex', alignItems: 'center', padding: '7px 10px' }}>
                      <button onClick={() => { const ag = loanAgreements.find(a => a.loan_id === selectedLoan.id); if (ag) openDocPopup('summary', ag); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, whiteSpace: 'nowrap' }}>Loan Summary</p>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right (1fr): Repayment Progress and You're Owed side-by-side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'stretch' }}>

                  {/* Repayment Progress */}
                  <div style={{ ...cardBase }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>Repayment Progress</div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                      <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                        <svg width="60" height="60" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="64" cy="64" r="45" fill="none" stroke={`${ringColor}26`} strokeWidth="10" />
                          <circle cx="64" cy="64" r="45" fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={ringOffset} />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>{paidPct}%</span>
                          <span style={{ fontSize: 7, fontWeight: 500, color: '#787776', fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>repaid</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', lineHeight: 1.4 }}>
                      {formatMoney(totalPaidAmt)} of {formatMoney(totalWithInterest)} {isLending ? 'repaid to you' : 'paid back'}
                    </div>
                  </div>

                  {/* You're Owed — right */}
                  <div style={{ ...cardBase }}>
                    <div style={{ marginBottom: 10 }}>
                      {isLending ? (
                        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                          <circle cx="14" cy="14" r="13" stroke="#03ACEA" strokeWidth="1.5"/>
                          <path d="M14 9 L14 17 M10.5 12.5 L14 9 L17.5 12.5" stroke="#03ACEA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                          <circle cx="14" cy="14" r="13" stroke="#1D5B94" strokeWidth="1.5"/>
                          <path d="M14 9 L14 17 M10.5 13.5 L14 17 L17.5 13.5" stroke="#1D5B94" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                      {isLending
                        ? <><span style={{ fontWeight: 600 }}>{otherPartyUsername.split(' ')[0]}</span> owes you <span style={{ color: '#03ACEA' }}>{formatMoney(remaining)}</span></>
                        : <>You owe <span style={{ fontWeight: 600 }}>{otherPartyUsername.split(' ')[0]}</span> <span style={{ color: '#1D5B94' }}>{formatMoney(remaining)}</span></>
                      }
                    </div>
                  </div>
                </div>

              </div>
            </>
          );
        })()}

        {/* 3-col: [Payment History + Activity] | [Payments] | [Loan Progress] */}
        <div className="loan-details-masonry" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageCard title="Payment History" wrapperStyle={{ marginBottom: 0 }}>
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

        </div>{/* end left column */}

        <div>
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
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#4B4A48', margin: 0 }}>Payment {row.number}: ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
        </div>{/* end payments column */}

        <div>
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
              <div className="loan-progress-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', rowGap: 22, columnGap: 16 }}>
                {lpItems.map((item, idx) => (<div key={idx} style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p><p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p>{item.sub && <p style={{ fontSize: 9, color: '#787776', marginTop: 2 }}>{item.sub}</p>}</div>))}
              </div>
            );
          })()}
          </div>
        </PageCard>
        </div>{/* end loan progress column */}

        </div>{/* end 3-col masonry */}

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
    const accent = isLending ? '#03ACEA' : '#1D5B94';
    const accentBg = isLending ? '#EBF4FA' : 'rgba(29,91,148,0.08)';
    const otherKey = isLending ? 'borrower_id' : 'lender_id';

    // Build card data for carousel
    const loanCards = activeLoans.map(loan => {
      const profile = publicProfiles.find(p => p.user_id === loan[otherKey]);
      const name = profile?.full_name?.split(' ')[0] || profile?.username || 'User';
      const remaining = Math.max(0, (loan.total_amount || loan.amount || 0) - (loan.amount_paid || 0));
      return { loan, profile, name, remaining };
    });
    const selectedIdx = loanCards.findIndex(c => c.loan.id === selectedScrollLoan?.id);

    // Overview ring component
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

    const rankingFilter = isLending ? rankingFilterLending : rankingFilterBorrowing;
    const setRankingFilter = isLending ? setRankingFilterLending : setRankingFilterBorrowing;

    const percentPaid   = totalOwedBorrowing   > 0 ? Math.round((totalPaidBorrowing   / totalOwedBorrowing)   * 100) : 0;
    const percentRepaid = totalExpectedLending > 0 ? Math.round((totalReceivedLending / totalExpectedLending) * 100) : 0;
    const borrowOwed = Math.max(0, totalOwedBorrowing - totalPaidBorrowing);
    const lentOwed   = Math.max(0, totalExpectedLending - totalReceivedLending);

    return (
      <>
        {/* Top 3-col grid: (Overview split + Snapshot) | Upcoming | (Your Lending) */}
        <div className="loans-top-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* Col 1: Two overview mini-boxes + Snapshot below */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Two side-by-side overview boxes */}
            <div style={{ display: 'flex', gap: 12 }}>

              {/* Box 1 — Amount owed/owing */}
              <div style={{ flex: 1, minWidth: 0, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 12px' }}>
                <div style={{ marginBottom: 10 }}>
                  {isLending ? (
                    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                      <circle cx="14" cy="14" r="13" stroke="#03ACEA" strokeWidth="1.5"/>
                      <path d="M14 9 L14 17 M10.5 12.5 L14 9 L17.5 12.5" stroke="#03ACEA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                      <circle cx="14" cy="14" r="13" stroke="#1D5B94" strokeWidth="1.5"/>
                      <path d="M14 9 L14 17 M10.5 13.5 L14 17 L17.5 13.5" stroke="#1D5B94" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                  {isLending ? (
                    <>You're owed <span style={{ color: '#03ACEA' }}>{formatMoney(lentOwed)}</span></>
                  ) : (
                    <>You owe <span style={{ color: '#1D5B94' }}>{formatMoney(borrowOwed)}</span></>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>
                  across {activeLoans.length} loan{activeLoans.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Box 2 — Repayment Progress */}
              <div style={{ flex: 1, minWidth: 0, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>Repayment Progress</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  {isLending ? (
                    <OvRing percent={percentRepaid} color="#03ACEA" label="Repaid" />
                  ) : (
                    <OvRing percent={percentPaid} color="#1D5B94" label="Paid back" />
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', lineHeight: 1.4 }}>
                  {isLending
                    ? <>{formatMoney(totalReceivedLending)} of {formatMoney(totalExpectedLending)} repaid to you</>
                    : <>{formatMoney(totalPaidBorrowing)} of {formatMoney(totalOwedBorrowing)} paid back</>
                  }
                </div>
              </div>
            </div>

            {/* Snapshot — below the two boxes */}
            {(() => {
              const today = new Date();
              const overdueCount = activeLoans.filter(l => l.next_payment_date && new Date(l.next_payment_date) < today).length;
              let insightText = '';
              if (activeLoans.length === 0) {
                insightText = isLending ? 'No active loans yet' : 'You have no active borrowing';
              } else if (overdueCount > 1) {
                insightText = isLending ? `${overdueCount} borrowers are behind on payments` : `${overdueCount} payments need your attention`;
              } else if (overdueCount === 1) {
                insightText = isLending ? 'One borrower is behind — follow up when ready' : "One quick payment and you're back on track";
              } else {
                insightText = isLending ? 'All your lent money is on track' : 'All your payments are on track';
              }
              return (
                <div style={{ background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>
                    {format(today, 'MMMM')} {isLending ? 'Lending' : 'Borrowing'} Snapshot
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', background: accentBg, color: accent, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>
                      {insightText}
                    </span>
                    {isLending && monthlyExpectedReceive > 0 && (
                      <div style={{ fontSize: 11, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, textAlign: 'center' }}>
                        Expected to receive <span style={{ color: accent, fontWeight: 600 }}>{formatMoney(monthlyExpectedReceive)}</span> this month
                      </div>
                    )}
                    {!isLending && monthlyExpectedPay > 0 && (
                      <div style={{ fontSize: 11, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, textAlign: 'center' }}>
                        Due to pay <span style={{ color: accent, fontWeight: 600 }}>{formatMoney(monthlyExpectedPay)}</span> this month
                      </div>
                    )}
                    {isLending && monthlyReceived > 0 && (
                      <div style={{ fontSize: 11, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, textAlign: 'center' }}>
                        {formatMoney(monthlyReceived)} received so far this month
                      </div>
                    )}
                    {!isLending && monthlyPaidOut > 0 && (
                      <div style={{ fontSize: 11, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, textAlign: 'center' }}>
                        {formatMoney(monthlyPaidOut)} paid out so far this month
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Col 2: Upcoming + Insights stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Upcoming — home Upcoming Payments style */}
          {(() => {
            const allPaymentLoans2 = activeLoans
              .filter(l => l.next_payment_date)
              .map(l => {
                const otherParty = publicProfiles.find(p => p.user_id === l[otherKey]);
                const days = daysUntilDate(l.next_payment_date);
                const payDate = toLocalDate(l.next_payment_date);
                const firstName = otherParty?.full_name?.split(' ')[0] || otherParty?.username || 'User';
                return { ...l, firstName, days, payDate };
              })
              .sort((a, b) => a.payDate - b.payDate);
            const combined = [...allPaymentLoans2.filter(l => l.days < 0), ...allPaymentLoans2.filter(l => l.days >= 0).slice(0, 6)];
            const firstDays = combined.length > 0 ? combined[0].days : null;
            const nextLabel = firstDays === null ? '' : firstDays < 0 ? 'overdue' : firstDays === 0 ? 'today' : firstDays === 1 ? 'tomorrow' : `in ${firstDays} days`;
            return (
              <div style={{ background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Upcoming</div>
                  <Link to={createPageUrl('Upcoming')} style={{ fontSize: 11, fontWeight: 500, color: accent, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>Full schedule →</Link>
                </div>
                {firstDays !== null && (
                  <div style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>
                    Next payment {nextLabel}
                  </div>
                )}
                {combined.length === 0 ? (
                  <div style={{ padding: '10px 0', fontSize: 12, color: '#787776', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>You're all caught up! 🎉</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {combined.map(loan => {
                      const isOverdue = loan.days < 0;
                      const barColor = isOverdue ? '#E8726E' : accent;
                      const amtStr = formatMoney(loan.payment_amount || 0);
                      const label = isOverdue
                        ? (isLending ? `${loan.firstName}'s ${amtStr} payment is overdue` : `Your ${amtStr} payment to ${loan.firstName} is overdue`)
                        : (isLending ? `Expect ${amtStr} from ${loan.firstName}` : `${amtStr} due to ${loan.firstName}`);
                      return (
                        <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                          <div style={{ width: 52, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
                            <div style={{ fontSize: 10, fontWeight: 500, color: '#9B9A98', letterSpacing: '-0.01em' }}>{format(loan.payDate, 'EEE')}</div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: isOverdue ? '#E8726E' : '#1A1918' }}>{format(loan.payDate, 'MMM d')}</div>
                          </div>
                          <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: barColor, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          </div>{/* end col 2 stack */}

          {/* Col 3: Your Lending/Borrowing stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Your Lending / Your Borrowing sorted list */}
            {activeLoans.length > 0 && (() => {
              const tone = isLending ? 'lending' : 'borrowing';
              const titleStr = isLending ? 'Your Lending' : 'Your Borrowing';
              const accentCol = isLending ? '#03ACEA' : '#1D5B94';
              const accentColBg = isLending ? 'rgba(3,172,234,0.10)' : 'rgba(29,91,148,0.10)';
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
                    <SelectTrigger className="w-auto h-7 px-2 border-0 text-xs font-medium rounded-lg" style={{ background: accentColBg, color: accentCol }}><SelectValue /></SelectTrigger>
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
                    {sortedLoans.slice(0, 5).map((loan, idx) => {
                      const otherUserId = isLending ? loan.borrower_id : loan.lender_id;
                      const op = publicProfiles.find(p => p.user_id === otherUserId);
                      const name = op?.full_name?.split(' ')[0] || op?.username || 'User';
                      const totalAmt = loan.total_amount || loan.amount || 0;
                      const paidAmt = loan.amount_paid || 0;
                      const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                      const isOverdue = loan.next_payment_date && new Date(loan.next_payment_date) < new Date();
                      const overdueAmt = isOverdue ? (loan.payment_amount || 0) : 0;
                      let badgeLabel = '', badgeColor = accentCol, badgeBg = accentColBg;
                      if (rankingFilter === 'status') { badgeLabel = isOverdue ? `${formatMoney(overdueAmt)} overdue` : 'On track'; badgeColor = isOverdue ? '#E8726E' : accentCol; badgeBg = isOverdue ? 'rgba(232,114,110,0.08)' : accentColBg; }
                      else if (rankingFilter === 'highest_interest' || rankingFilter === 'lowest_interest') { badgeLabel = `${loan.interest_rate || 0}% interest`; }
                      else if (rankingFilter === 'highest_payment' || rankingFilter === 'lowest_payment') { badgeLabel = `${formatMoney(loan.payment_amount || 0)}/period`; }
                      else if (rankingFilter === 'soonest_deadline') { const d = loan.next_payment_date ? daysUntilDate(loan.next_payment_date) : null; badgeLabel = d === null ? '—' : d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `${d}d`; if (d !== null && d < 0) { badgeColor = '#E8726E'; badgeBg = 'rgba(232,114,110,0.08)'; } }
                      else if (rankingFilter === 'largest_amount' || rankingFilter === 'smallest_amount') { badgeLabel = `${formatMoney(totalAmt)} total`; }
                      else if (rankingFilter === 'most_repaid' || rankingFilter === 'least_repaid') { badgeLabel = `${pct}% repaid`; }
                      else if (rankingFilter === 'most_recent') { badgeLabel = loan.created_at ? format(new Date(loan.created_at), 'MMM d') : '—'; }
                      return (
                        <div key={loan.id} style={{ padding: '9px 0', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          {(() => {
                            const lendGrad = ['#7FD9FF','#3DC4F5','#03ACEA','#0291C0','#027AA3'];
                            const borrGrad = ['#7AAED4','#4D8DBF','#2B6EA8','#1D5B94','#154578'];
                            const circleColor = (isLending ? lendGrad : borrGrad)[idx] || accentCol;
                            return (
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: circleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#ffffff', lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>{idx + 1}</span>
                              </div>
                            );
                          })()}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 5, padding: '2px 6px', lineHeight: 1.2 }}>{badgeLabel}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isLending ? `Borrowed ${formatMoney(totalAmt)} from you${loan.purpose ? ` for ${loan.purpose}` : ''}` : `Lent you ${formatMoney(totalAmt)}${loan.purpose ? ` for ${loan.purpose}` : ''}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </PageCard>
              );
            })()}
          </div>{/* end col 3 */}

        </div>{/* end top grid */}

        {/* Loan carousel */}
        {loanCards.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginBottom: 24, textAlign: 'center', letterSpacing: '-0.01em' }}>
              Select a loan to view details
            </div>

            {/* Cards fan row */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16, padding: '8px 24px 32px', overflowX: 'auto', overflowY: 'visible' }}>
              {loanCards.map(({ loan, profile, name, remaining }, idx) => {
                const isSelected = selectedIdx === idx;
                const diff = selectedIdx === -1 ? 0 : idx - selectedIdx;
                const rotate = isSelected || selectedIdx === -1 ? 0 : diff * 9;
                const scale = isSelected ? 1.07 : Math.max(0.80, 1 - Math.abs(diff) * 0.05);
                const ty = isSelected || selectedIdx === -1 ? 0 : Math.abs(diff) * 5;
                const zIdx = isSelected ? 10 : Math.max(1, 6 - Math.abs(diff));
                return (
                  <div
                    key={loan.id}
                    onClick={() => setSelectedScrollLoan(isSelected ? null : loan)}
                    style={{
                      width: 115,
                      flexShrink: 0,
                      background: '#ffffff',
                      borderRadius: 12,
                      border: isSelected ? `2px solid ${accent}` : '1.5px solid rgba(0,0,0,0.08)',
                      boxShadow: isSelected
                        ? `0 6px 24px ${accent}30, 0 2px 8px rgba(0,0,0,0.08)`
                        : '0 2px 8px rgba(0,0,0,0.06)',
                      padding: '14px 10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 7,
                      cursor: 'pointer',
                      transform: `rotate(${rotate}deg) scale(${scale}) translateY(${ty}px)`,
                      transformOrigin: 'bottom center',
                      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s, border-color 0.2s',
                      position: 'relative',
                      zIndex: zIdx,
                      userSelect: 'none',
                    }}
                  >
                    <UserAvatar
                      name={profile?.full_name || profile?.username || name}
                      src={profile?.avatar_url || profile?.profile_picture_url}
                      size={38}
                      radius={19}
                    />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', lineHeight: 1.25 }}>{name}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: accent, fontFamily: "'DM Sans', sans-serif" }}>{formatMoney(remaining)}</div>
                    {loan.purpose && (
                      <div style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {loan.purpose}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detail panel */}
            {selectedScrollLoan && (
              <div style={{ marginTop: 4 }}>
                {renderLoanDetailBody(selectedScrollLoan)}
              </div>
            )}
          </div>
        )}
      </>
    );
  };


  const LENDER_GREEN = '#03ACEA';

  const PageCard = ({ title, headerRight, children, style, highlight, tone, wrapperStyle }) => {
    return (
    <div style={{ position: 'relative', marginBottom: 24, ...wrapperStyle }}>
    <div style={{
      position: 'relative', zIndex: 1,
      background: '#ffffff',
      borderRadius: 10,
      border: 'none',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
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

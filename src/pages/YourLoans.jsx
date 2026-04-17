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
import SidebarBottomSection from '../components/SidebarBottomSection';
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";

export default function YourLoans({ defaultTab }) {
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
  const [rankingFilterLending, setRankingFilterLending] = useState('highest_interest');
  const [rankingFilterBorrowing, setRankingFilterBorrowing] = useState('highest_interest');
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
              {/* DESKTOP: two aurora cards side-by-side + pie Payment Progress in right column */}
              <div className="loans-detail-desktop-only" style={{ gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                  <PageCard title="Loan Terms" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {loanTermItems.map((item, idx) => (<div key={idx} style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#787776', fontWeight: 500, marginBottom: 2 }}>{item.label}</p><p style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0 }}>{item.value}</p></div>))}
                    </div>
                  </PageCard>
                </div>
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

              {/* MOBILE: consolidated Next Payment Due + Payment Progress aurora cards */}
              <div className="loans-detail-mobile-only">
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
                      <span style={{ fontSize: 11, color: '#9B9A98', marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatMoney(nextPmtAmt)} {isLending ? `from ${otherPartyUsername}` : `to ${otherPartyUsername}`}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                      <span style={{ fontSize: 11, color: '#9B9A98' }}>{isLending ? 'None incoming ✨' : 'Nothing due 🎉'}</span>
                    </div>
                  )}
                </AuroraCard>
                <AuroraCard>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Payment Progress</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                    <span style={{ fontSize: 15, letterSpacing: '-0.02em', flexShrink: 0, color: '#1A1918' }}>
                      <span style={{ fontWeight: 800 }}>{Math.round(paidPct)}%</span>
                      <span style={{ fontWeight: 400 }}> {isLending ? 'repaid' : 'paid back'}</span>
                    </span>
                    <span style={{ fontSize: 11, color: '#9B9A98', marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      ${totalPaidAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${totalWithInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} repaid
                    </span>
                  </div>
                </AuroraCard>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
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
          {/* Next Incoming / Next Payment Due — aurora card */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Aurora glow — cyan/teal palette */}
            {/* Gradient border wrapper */}
            <div style={{
              position: 'relative', zIndex: 1, flex: 1,
              borderRadius: 11, display: 'flex', flexDirection: 'column',
              boxShadow: '0 -1px 3px rgba(78,108,135,0.6), 0 -5px 11px rgba(125,155,180,0.42), 0 -12px 22px rgba(48,68,88,0.22), 0 2px 4px rgba(215,228,238,0.65), 0 6px 13px rgba(168,195,215,0.48), 0 13px 24px rgba(125,155,180,0.26), 0 0 18px rgba(125,155,180,0.3), 0 0 30px rgba(78,108,135,0.14)',
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

          {/* Next Payment Amount — aurora style */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Gradient border wrapper */}
            <div style={{
              position: 'relative', zIndex: 1, flex: 1,
              borderRadius: 11, display: 'flex', flexDirection: 'column',
              boxShadow: '0 -1px 3px rgba(78,108,135,0.6), 0 -5px 11px rgba(125,155,180,0.42), 0 -12px 22px rgba(48,68,88,0.22), 0 2px 4px rgba(215,228,238,0.65), 0 6px 13px rgba(168,195,215,0.48), 0 13px 24px rgba(125,155,180,0.26), 0 0 18px rgba(125,155,180,0.3), 0 0 30px rgba(78,108,135,0.14)',
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

          {/* You Owe / Owed to You — aurora card matching the other two */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              position: 'relative', zIndex: 1, flex: 1,
              borderRadius: 11, display: 'flex', flexDirection: 'column',
              boxShadow: '0 -1px 3px rgba(78,108,135,0.6), 0 -5px 11px rgba(125,155,180,0.42), 0 -12px 22px rgba(48,68,88,0.22), 0 2px 4px rgba(215,228,238,0.65), 0 6px 13px rgba(168,195,215,0.48), 0 13px 24px rgba(125,155,180,0.26), 0 0 18px rgba(125,155,180,0.3), 0 0 30px rgba(78,108,135,0.14)',
            }}>
            <div style={{
              flex: 1,
              padding: '10px 14px', borderRadius: 10,
              background: '#ffffff',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: isLending ? 'rgba(3,172,234,0.12)' : 'rgba(29,91,148,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isLending ? '#03ACEA' : '#1D5B94'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {isLending ? 'Owed to You' : 'You Owe'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', overflow: 'hidden' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', flexShrink: 0 }}>
                  {formatMoney(Math.max(0, totalOwedAll - totalPaidAll))}
                </span>
                <span style={{ fontSize: 11, color: '#9B9A98', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  outstanding
                </span>
              </div>
            </div>
            </div>
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

              {/* Active Lending (lending) / Loans Ranked By (borrowing) — right of Upcoming */}
              {activeLoans.length > 0 && (
                isLending ? (
                  <PageCard title="Active Lending Summary" style={{ marginBottom: 0 }} headerRight={
                    <Select value={rankingFilter} onValueChange={setRankingFilter}>
                      <SelectTrigger className="w-auto h-7 px-2 border-0 text-xs font-medium rounded-lg" style={{ background: 'rgba(3,172,234,0.10)', color: '#03ACEA' }}><SelectValue /></SelectTrigger>
                      <SelectContent>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(() => {
                        const RPC = ({ percentage, number, size = 32 }) => {
                          const cx = size / 2; const r = cx - 3; const circ = 2 * Math.PI * r;
                          const dash = (percentage / 100) * circ; const sw = 4;
                          return (
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
                              <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E5E4E2" strokeWidth={sw} />
                              {percentage > 0 && <circle cx={cx} cy={cx} r={r} fill="none" stroke="#03ACEA" strokeWidth={sw} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`} />}
                              <text x={cx} y={cx} textAnchor="middle" dominantBaseline="central" fill="#1A1918" fontSize="11" fontWeight="bold" fontFamily="'DM Sans', sans-serif">{number}</text>
                            </svg>
                          );
                        };
                        const sorted = [...activeLoans].sort((a, b) => {
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
                        return sorted.slice(0, 5).map((loan, idx) => {
                          const op = publicProfiles.find(p => p.user_id === loan.borrower_id);
                          const totalAmt = loan.total_amount || loan.amount || 0;
                          const paidAmt = loan.amount_paid || 0;
                          const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                          const name = op?.full_name?.split(' ')[0] || op?.username || 'User';
                          const purpose = loan.purpose ? ` for ${loan.purpose}` : '';
                          let lv = '';
                          if (rankingFilter === 'highest_interest' || rankingFilter === 'lowest_interest') lv = `${loan.interest_rate || 0}%`;
                          else if (rankingFilter === 'highest_payment' || rankingFilter === 'lowest_payment') lv = formatMoney(loan.payment_amount || 0);
                          else if (rankingFilter === 'soonest_deadline') { const d = loan.next_payment_date ? daysUntilDate(loan.next_payment_date) : null; lv = d === null ? '—' : d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `${d}d`; }
                          else if (rankingFilter === 'largest_amount' || rankingFilter === 'smallest_amount') lv = formatMoney(totalAmt);
                          else if (rankingFilter === 'most_repaid' || rankingFilter === 'least_repaid') lv = `${pct}%`;
                          else if (rankingFilter === 'most_recent') lv = loan.created_at ? format(new Date(loan.created_at), 'MMM d') : '—';
                          return (
                            <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: idx < 4 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                              <RPC percentage={pct} number={idx + 1} size={32} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                                  <div style={{ fontSize: 13, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>You lent {name} {formatMoney(totalAmt)}{purpose}</div>
                                </div>
                                <div style={{ fontSize: 11, color: '#9B9A98' }}>{formatMoney(paidAmt)} of {formatMoney(totalAmt)} paid back</div>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#03ACEA', flexShrink: 0 }}>{lv}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </PageCard>
                ) : (
                  <PageCard title="Active Borrowing Summary" style={{ marginBottom: 0 }} headerRight={
                    <Select value={rankingFilter} onValueChange={setRankingFilter}>
                      <SelectTrigger className="w-auto h-7 px-2 border-0 text-xs font-medium rounded-lg" style={{ background: 'rgba(29,91,148,0.10)', color: '#1D5B94' }}><SelectValue /></SelectTrigger>
                      <SelectContent>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(() => {
                        const RPC = ({ percentage, number, size = 32 }) => {
                          const cx = size / 2; const r = cx - 3; const circ = 2 * Math.PI * r;
                          const dash = (percentage / 100) * circ; const sw = 4;
                          return (
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
                              <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E5E4E2" strokeWidth={sw} />
                              {percentage > 0 && <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1D5B94" strokeWidth={sw} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`} />}
                              <text x={cx} y={cx} textAnchor="middle" dominantBaseline="central" fill="#1A1918" fontSize="11" fontWeight="bold" fontFamily="'DM Sans', sans-serif">{number}</text>
                            </svg>
                          );
                        };
                        const sorted = [...activeLoans].sort((a, b) => {
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
                        return sorted.slice(0, 5).map((loan, idx) => {
                          const op = publicProfiles.find(p => p.user_id === loan.lender_id);
                          const totalAmt = loan.total_amount || loan.amount || 0;
                          const paidAmt = loan.amount_paid || 0;
                          const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                          const name = op?.full_name?.split(' ')[0] || op?.username || 'User';
                          const purpose = loan.purpose ? ` for ${loan.purpose}` : '';
                          let lv = '';
                          if (rankingFilter === 'highest_interest' || rankingFilter === 'lowest_interest') lv = `${loan.interest_rate || 0}%`;
                          else if (rankingFilter === 'highest_payment' || rankingFilter === 'lowest_payment') lv = formatMoney(loan.payment_amount || 0);
                          else if (rankingFilter === 'soonest_deadline') { const d = loan.next_payment_date ? daysUntilDate(loan.next_payment_date) : null; lv = d === null ? '—' : d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `${d}d`; }
                          else if (rankingFilter === 'largest_amount' || rankingFilter === 'smallest_amount') lv = formatMoney(totalAmt);
                          else if (rankingFilter === 'most_repaid' || rankingFilter === 'least_repaid') lv = `${pct}%`;
                          else if (rankingFilter === 'most_recent') lv = loan.created_at ? format(new Date(loan.created_at), 'MMM d') : '—';
                          return (
                            <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: idx < 4 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                              <RPC percentage={pct} number={idx + 1} size={32} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                                  <div style={{ fontSize: 13, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name} lent you {formatMoney(totalAmt)}{purpose}</div>
                                </div>
                                <div style={{ fontSize: 11, color: '#9B9A98' }}>{formatMoney(paidAmt)} of {formatMoney(totalAmt)} repaid</div>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#1D5B94', flexShrink: 0 }}>{lv}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </PageCard>
                )
              )}
            </div>
          );
        })()}

        {/* Scrollable loan card row — blue box */}
        {activeLoans.length > 0 && (
          <div style={{ marginBottom: 24, background: 'rgba(3,172,234,0.05)', border: '1px solid rgba(3,172,234,0.18)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
              Select a Loan to View Details
            </div>
            <div className="loan-card-scroll" style={{
              display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
              scrollbarWidth: 'none', msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}>
              {activeLoans.map(loan => {
                const otherProfile = publicProfiles.find(p => p.user_id === (isLending ? loan.borrower_id : loan.lender_id));
                const fullName = otherProfile?.full_name || otherProfile?.username || 'User';
                const firstName = fullName.split(' ')[0];
                const totalAmt = loan.total_amount || loan.amount || 0;
                const paidAmt = loan.amount_paid || 0;
                const purpose = loan.purpose || '';
                const daysLeft = loan.next_payment_date ? daysUntilDate(loan.next_payment_date) : null;
                const isOverdue = daysLeft !== null && daysLeft < 0;
                const statusLabel = isOverdue ? 'Overdue' : 'On Track';
                const statusBg = isOverdue ? 'rgba(232,114,110,0.12)' : 'rgba(3,172,234,0.12)';
                const statusColor = isOverdue ? '#B94040' : '#0A7AB0';
                const daysLabel = daysLeft === null ? null : isOverdue ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? 'today' : `${daysLeft}d`;
                return (
                  <div
                    key={loan.id}
                    onClick={() => setSelectedScrollLoan(loan)}
                    style={{
                      flexShrink: 0, width: 220,
                      background: 'white', borderRadius: 12,
                      border: selectedScrollLoan?.id === loan.id ? '1.5px solid rgba(3,172,234,0.5)' : '1px solid rgba(0,0,0,0.07)',
                      boxShadow: selectedScrollLoan?.id === loan.id ? '0 2px 12px rgba(3,172,234,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                      padding: '12px 14px',
                      display: 'flex', flexDirection: 'column', gap: 8,
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s, transform 0.15s',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = selectedScrollLoan?.id === loan.id ? '0 2px 12px rgba(3,172,234,0.12)' : '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {/* Single row: avatar | name (flex:1) | status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserAvatar
                        name={fullName}
                        src={otherProfile?.profile_picture_url}
                        size={26}
                        radius={5}
                      />
                      <div style={{
                        flex: 1, fontSize: 13, fontWeight: 600, color: '#1A1918',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {firstName}
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 700,
                        color: statusColor, background: statusBg,
                        borderRadius: 6, padding: '2px 7px', letterSpacing: '0.01em', flexShrink: 0,
                      }}>
                        {statusLabel}
                      </div>
                    </div>

                    {/* "You lent/borrowed $X for reason" */}
                    <div style={{ fontSize: 11, color: '#787776', lineHeight: 1.4 }}>
                      {isLending ? 'You lent' : 'You borrowed'}{' '}
                      <span style={{ fontWeight: 600, color: '#1A1918' }}>{formatMoney(totalAmt)}</span>
                      {purpose && <span style={{ color: '#9B9A98' }}> for {purpose}</span>}
                    </div>

                    {/* next payment line */}
                    {daysLabel !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11, color: '#787776' }}>
                        <span>{isLending ? 'Next payment incoming' : 'Next payment due'}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: isOverdue ? '#D97706' : '#6B3FA0',
                          background: isOverdue ? 'rgba(217,119,6,0.10)' : 'rgba(107,63,160,0.10)',
                          borderRadius: 6, padding: '2px 7px',
                          letterSpacing: '0.01em', whiteSpace: 'nowrap',
                        }}>
                          {daysLabel}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Loan details — inside the blue box, shown when a loan is selected */}
            {selectedScrollLoan && (() => {
              const detailProfile = publicProfiles.find(p => p.user_id === (isLending ? selectedScrollLoan.borrower_id : selectedScrollLoan.lender_id));
              const detailFullName = detailProfile?.full_name || 'User';
              const detailAmt = selectedScrollLoan.total_amount || selectedScrollLoan.amount || 0;
              const detailPurpose = selectedScrollLoan.purpose;
              return (
                <>
                  {/* Full-width loan header banner */}
                  <div style={{
                    marginTop: 16, marginBottom: 20,
                    padding: '13px 16px',
                    background: 'rgba(3,172,234,0.08)',
                    borderRadius: 10,
                    border: '1px solid rgba(3,172,234,0.15)',
                    width: '100%', boxSizing: 'border-box',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                      {isLending ? 'You lent' : 'You borrowed'}{' '}
                      {formatMoney(detailAmt)}{' '}
                      {isLending ? 'to' : 'from'}{' '}
                      {detailFullName}
                    </span>
                    {detailPurpose && (
                      <span style={{ fontSize: 14, fontWeight: 400, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>
                        {' '}for {detailPurpose}
                      </span>
                    )}
                  </div>
                  {renderLoanDetailBody(selectedScrollLoan)}
                </>
              );
            })()}
          </div>
        )}

      </>
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
        <div className="mesh-left" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ position: 'sticky', top: 0, padding: '24px 8px 0' }}>
            <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.3rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 16, paddingLeft: 6 }}>Vony</Link>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'Home', to: '/' },
                { label: 'Upcoming', to: createPageUrl("Upcoming") },
                { label: 'Create Loan', to: createPageUrl("CreateOffer") },
                { label: 'Record Payment', to: createPageUrl("RecordPayment") },
                { label: 'Lending', to: createPageUrl("Lending") },
                { label: 'Borrowing', to: createPageUrl("Borrowing") },
                { label: 'Friends', to: createPageUrl("Friends") },
                { label: 'Recent Activity', to: createPageUrl("RecentActivity") },
                { label: 'Documents', to: createPageUrl("LoanAgreements") },
              ].map(({ label, to }) => {
                const currentPath = window.location.pathname;
                const isActive = to === '/' ? currentPath === '/' : currentPath.includes(to.split('?')[0].replace('/app/', ''));
                const navIcons = {
                  'Home': <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                  'Upcoming': <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                  'Create Loan': <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
                  'Record Payment': <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
                  'Lending': <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
                  'Borrowing': <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="18" x2="12" y2="6"/><circle cx="12" cy="6" r="3"/></svg>,
                  'Friends': <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                  'Recent Activity': <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                  'Documents': <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                };
                return (
                  <Link key={label} to={to} style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#1A1918' : '#787776',
                    background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                    fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
                  }}>
                    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#03ACEA' : '#9B9A98' }}>{navIcons[label]}</span>
                    {label}
                  </Link>
                );
              })}
            </nav>
            <SidebarBottomSection />
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 32px 80px' }}>

          {/* Mobile-only page title */}
          {!defaultTab ? (
          <div className="mobile-page-title">
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', marginBottom: 0 }}>
              {[{key:'lending',label:'Lending'},{key:'borrowing',label:'Borrowing'}].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  paddingBottom: 10, border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 17, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
                  letterSpacing: '-0.02em',
                  color: activeTab === tab.key ? '#1A1918' : 'rgba(0,0,0,0.28)',
                  transition: 'color 0.2s',
                }}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginLeft: -32, marginRight: -32, marginBottom: 20 }} />
          </div>
          ) : (
          <div className="mobile-page-title">
            <div style={{ paddingBottom: 10, marginBottom: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '-0.02em', color: '#1A1918' }}>
                {defaultTab === 'lending' ? 'Lending' : 'Borrowing'}
              </span>
            </div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginLeft: -32, marginRight: -32, marginBottom: 20 }} />
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

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, User, LoanAgreement, PublicProfile } from "@/entities/all";
import { FileText, ChevronLeft, X } from "lucide-react";
import { format, addDays, addMonths, addWeeks } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday } from "@/components/utils/dateUtils";
import { formatTZ } from "@/components/utils/timezone";
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from "../components/DesktopSidebar";

// ─────────────────────────────────────────────
// Amortization helper (mirror of YourLoans)
// ─────────────────────────────────────────────
function generateAmortizationSchedule(agreement) {
  const schedule = [];
  const loanAmount = agreement.amount || 0;
  const frequency = agreement.payment_frequency || "monthly";
  const annualRate = agreement.interest_rate || 0;
  if (loanAmount <= 0) return schedule;
  const repaymentPeriod = agreement.repayment_period || 1;
  const repaymentUnit = agreement.repayment_unit || "months";
  let totalMonths = repaymentPeriod;
  if (repaymentUnit === "years") totalMonths = repaymentPeriod * 12;
  else if (repaymentUnit === "weeks") totalMonths = repaymentPeriod / 4.333;
  let totalPayments;
  if (frequency === "weekly") totalPayments = Math.round(totalMonths * 4.333);
  else if (frequency === "biweekly") totalPayments = Math.round(totalMonths * 2.167);
  else if (frequency === "daily") totalPayments = Math.round(totalMonths * 30.417);
  else totalPayments = Math.round(totalMonths);
  if (totalPayments <= 0) totalPayments = 1;
  let periodsPerYear = 12;
  if (frequency === "weekly") periodsPerYear = 52;
  else if (frequency === "biweekly") periodsPerYear = 26;
  else if (frequency === "daily") periodsPerYear = 365;
  const r = annualRate > 0 ? (annualRate / 100) / periodsPerYear : 0;
  let rawPayment;
  if (r > 0) rawPayment = (loanAmount * r) / (1 - Math.pow(1 + r, -totalPayments));
  else rawPayment = loanAmount / totalPayments;
  let balance = loanAmount;
  let currentDate = new Date(agreement.created_at);
  let principalToDate = 0;
  let interestToDate = 0;
  for (let i = 1; i <= totalPayments; i++) {
    if (frequency === "weekly") currentDate = addWeeks(currentDate, 1);
    else if (frequency === "biweekly") currentDate = addWeeks(currentDate, 2);
    else if (frequency === "daily") currentDate = addDays(currentDate, 1);
    else currentDate = addMonths(currentDate, 1);
    const startingBalance = balance;
    const interest = Math.round(balance * r * 100) / 100;
    let principal;
    if (i === totalPayments) {
      principal = balance;
      balance = 0;
    } else {
      const newBalance = Math.round((balance * (1 + r) - rawPayment) * 100) / 100;
      principal = Math.round((startingBalance - newBalance) * 100) / 100;
      balance = newBalance;
    }
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
  const frequency = loan.payment_frequency || "monthly";
  const originalPaymentAmount = loan.payment_amount || 0;
  let periodsPerYear = 12;
  if (frequency === "weekly") periodsPerYear = 52;
  else if (frequency === "biweekly") periodsPerYear = 26;
  else if (frequency === "daily") periodsPerYear = 365;
  const r = annualRate > 0 ? (annualRate / 100) / periodsPerYear : 0;
  const confirmedPayments = payments
    .filter(p => p.loan_id === loan.id && (p.status === "confirmed" || p.status === "completed"))
    .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
  const allLoanPayments = payments
    .filter(p => p.loan_id === loan.id && (p.status === "confirmed" || p.status === "completed" || p.status === "pending_confirmation"))
    .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
  let scheduleDates = [];
  if (agreement) {
    const sched = generateAmortizationSchedule(agreement);
    scheduleDates = sched.map(s => s.date);
  } else {
    let dt = new Date(loan.created_at);
    for (let i = 0; i < totalPeriods; i++) {
      if (frequency === "weekly") dt = addWeeks(new Date(dt), 1);
      else if (frequency === "biweekly") dt = addWeeks(new Date(dt), 2);
      else if (frequency === "daily") dt = addDays(new Date(dt), 1);
      else dt = addMonths(new Date(dt), 1);
      scheduleDates.push(new Date(dt));
    }
  }
  const loanStart = new Date(loan.created_at);
  const effectivePeriods = Math.min(totalPeriods, scheduleDates.length);
  const periodAllPayments = Array.from({ length: effectivePeriods }, () => []);
  for (let i = 0; i < effectivePeriods; i++) {
    const periodStart = i === 0 ? loanStart : scheduleDates[i - 1];
    const periodEnd = scheduleDates[i];
    periodAllPayments[i] = allLoanPayments.filter(p => {
      const pDate = new Date(p.payment_date);
      return pDate > periodStart && pDate <= periodEnd;
    });
  }
  if (scheduleDates.length > 0 && effectivePeriods > 0) {
    const lastDate = scheduleDates[scheduleDates.length - 1];
    const lateAll = allLoanPayments.filter(p => new Date(p.payment_date) > lastDate);
    if (lateAll.length > 0) periodAllPayments[effectivePeriods - 1] = [...periodAllPayments[effectivePeriods - 1], ...lateAll];
  }
  const periodConfirmedPayments = Array.from({ length: effectivePeriods }, () => []);
  const confirmedPool = confirmedPayments.map(p => ({ ...p, _rem: p.amount || 0 }));
  let poolIdx = 0;
  for (let i = 0; i < effectivePeriods; i++) {
    let bucketFilled = 0;
    while (poolIdx < confirmedPool.length && bucketFilled < originalPaymentAmount) {
      const p = confirmedPool[poolIdx];
      const take = Math.min(p._rem, originalPaymentAmount - bucketFilled);
      if (take > 0) {
        periodConfirmedPayments[i].push({ ...p, amount: take });
        p._rem -= take;
        bucketFilled += take;
      }
      if (p._rem <= 0) poolIdx++;
      else break;
    }
  }
  let remainingPrincipal = principal;
  let totalInterestAccrued = 0;
  let totalPaid = 0;
  let fullPaymentCount = 0;
  const periodResults = [];
  for (let i = 0; i < effectivePeriods; i++) {
    const periodInterest = Math.round(remainingPrincipal * r * 100) / 100;
    totalInterestAccrued += periodInterest;
    const scheduledAmount = originalPaymentAmount;
    const confirmedInPeriod = periodConfirmedPayments[i].reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingInPeriod = periodAllPayments[i]
      .filter(p => p.status === "pending_confirmation")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    totalPaid += confirmedInPeriod;
    const allocatedConfirmed = Math.min(confirmedInPeriod, scheduledAmount);
    const isFullPayment = confirmedInPeriod >= scheduledAmount && scheduledAmount > 0;
    if (isFullPayment) fullPaymentCount++;
    const paymentToInterest = Math.min(allocatedConfirmed, periodInterest);
    const paymentToPrincipal = Math.max(0, allocatedConfirmed - paymentToInterest);
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
      interestThisPeriod: periodInterest, remainingPrincipal,
      confirmedPayments: periodConfirmedPayments[i], allPayments: periodAllPayments[i]
    });
  }
  const totalOwedNow = Math.max(0, Math.round((principal + totalInterestAccrued - totalPaid) * 100) / 100);
  const unpaidPeriods = totalPeriods - fullPaymentCount;
  const recalcPayment = unpaidPeriods > 0 && totalOwedNow > 0 ? Math.round((totalOwedNow / unpaidPeriods) * 100) / 100 : 0;
  const nextPaymentAmt = recalcPayment > 0 ? recalcPayment : originalPaymentAmount;
  return {
    principal, totalOwedNow, totalPaid, totalInterestAccrued, remainingPrincipal, fullPaymentCount, totalPeriods,
    recalcPayment, nextPaymentAmount: nextPaymentAmt, originalPaymentAmount, periodResults,
    paidPercentage: (principal + totalInterestAccrued) > 0 ? Math.min(100, (totalPaid / (principal + totalInterestAccrued)) * 100) : 0
  };
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function LoanDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const loanId = searchParams.get("id");

  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [agreement, setAgreement] = useState(null);
  const [lenderProfile, setLenderProfile] = useState(null);
  const [borrowerProfile, setBorrowerProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState(null); // 'promissory' | 'amortization'

  useEffect(() => {
    if (!loanId) return;
    loadData();
  }, [loanId]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [loans, allPayments, agreements, profiles, users] = await Promise.all([
        Loan.list(),
        Payment.list(),
        LoanAgreement.list(),
        PublicProfile.list(),
        User.list(),
      ]);
      const thisLoan = loans.find(l => l.id === loanId);
      if (!thisLoan) { setIsLoading(false); return; }
      setLoan(thisLoan);
      setPayments(allPayments.filter(p => p.loan_id === loanId));
      const ag = agreements.find(a => a.loan_id === loanId);
      setAgreement(ag || null);
      const lender = profiles.find(p => p.user_id === thisLoan.lender_id);
      const borrower = profiles.find(p => p.user_id === thisLoan.borrower_id);
      setLenderProfile(lender || null);
      setBorrowerProfile(borrower || null);
      const me = users.find(u => u.id === authUser?.id);
      setCurrentUser(me || null);
    } catch (e) {
      console.error("LoanDetail loadData error:", e);
    }
    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "2px solid #03ACEA", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px" }} className="animate-spin" />
          <p style={{ fontSize: 12, color: "#787776", fontFamily: "'DM Sans', sans-serif" }}>Loading loan details…</p>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 16, color: "#1A1918", fontFamily: "'DM Sans', sans-serif" }}>Loan not found.</p>
        <button onClick={() => navigate(createPageUrl('YourLoans'))} style={{ fontSize: 13, color: "#03ACEA", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Go back</button>
      </div>
    );
  }

  const isLending = loan.lender_id === authUser?.id;
  const lenderName = lenderProfile?.full_name || "Lender";
  const borrowerName = borrowerProfile?.full_name || "Borrower";
  const otherName = isLending ? borrowerName : lenderName;
  const myName = isLending ? lenderName : borrowerName;
  const accent = isLending ? "#03ACEA" : "#1D5B94";

  // Analysis
  const loanAnalysis = analyzeLoanPayments(loan, payments, agreement);
  const totalPaidAmt = loanAnalysis ? loanAnalysis.totalPaid : (loan.amount_paid || 0);
  const totalWithInterest = loanAnalysis ? (loanAnalysis.principal + loanAnalysis.totalInterestAccrued) : (loan.total_amount || loan.amount || 0);
  const remaining = Math.max(0, totalWithInterest - totalPaidAmt);
  const paidPct = Math.round(totalWithInterest > 0 ? Math.min(100, (totalPaidAmt / totalWithInterest) * 100) : 0);
  const fullPaymentCount = loanAnalysis ? loanAnalysis.fullPaymentCount : 0;
  const totalPeriods = loan.repayment_period || 0;
  const paymentFrequency = loan.payment_frequency || "monthly";
  const freqLabel = paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1);
  const plannedPaymentAmount = loan.payment_amount || 0;
  const recalcPayment = loanAnalysis ? loanAnalysis.recalcPayment : 0;
  const displayPaymentAmt = recalcPayment > 0 ? recalcPayment : plannedPaymentAmount;
  const totalOwedDisplay = loanAnalysis ? loanAnalysis.totalOwedNow : (loan.total_amount || loan.amount || 0);

  // Chart data
  const chartData = [];
  const chartHeight = 120;
  if (loanAnalysis) {
    loanAnalysis.periodResults.forEach((pr, i) => {
      const scheduledAmt = pr.scheduledAmount || (recalcPayment > 0 ? recalcPayment : plannedPaymentAmount);
      if (pr.hasAnyPayments) {
        chartData.push({ label: `P${i + 1}`, amount: pr.actualPaid, scheduledAmount: scheduledAmt, isPaid: true, isProjected: false, isFullPayment: pr.isFullPayment, isInProgress: !pr.isPast && pr.hasAnyPayments, hasPendingOnly: !pr.hasConfirmedPayments && pr.hasPendingPayments });
      } else if (pr.isPast) {
        chartData.push({ label: `P${i + 1}`, amount: 0, scheduledAmount: scheduledAmt, isPaid: false, isProjected: false, isMissed: true });
      } else {
        chartData.push({ label: `P${i + 1}`, amount: scheduledAmt, scheduledAmount: scheduledAmt, isPaid: false, isProjected: true });
      }
    });
  }
  const maxChartVal = Math.max(plannedPaymentAmount, ...chartData.map(d => d.amount), 1);

  // Activity items
  const activities = [];
  if (loan.created_at) activities.push({ timestamp: new Date(loan.created_at), type: "created", description: `Loan created between ${borrowerName} and ${lenderName}` });
  if (agreement?.borrower_signed_date) activities.push({ timestamp: new Date(agreement.borrower_signed_date), type: "signature", description: `${borrowerName} signed the loan agreement` });
  if (agreement?.lender_signed_date) activities.push({ timestamp: new Date(agreement.lender_signed_date), type: "signature", description: `${lenderName} signed the loan agreement` });
  payments.forEach(payment => {
    const isConfirmed = payment.status === "completed" || payment.status === "confirmed";
    const pmtAmount = formatMoney(payment.amount || 0);
    let desc;
    if (isLending) {
      if (payment.recorded_by === authUser?.id) desc = `You ${isConfirmed ? "confirmed" : "recorded"} a ${pmtAmount} payment from ${borrowerName}`;
      else desc = `${borrowerName} ${isConfirmed ? "made" : "recorded"} a ${pmtAmount} payment`;
    } else {
      if (payment.recorded_by === authUser?.id) desc = `You ${isConfirmed ? "made" : "recorded"} a ${pmtAmount} payment to ${lenderName}`;
      else desc = `${lenderName} recorded a ${pmtAmount} payment from ${borrowerName}`;
    }
    activities.push({ timestamp: new Date(payment.payment_date || payment.created_at), type: "payment", description: desc, isAwaitingConfirmation: !isConfirmed });
  });
  if (agreement?.cancelled_date) activities.push({ timestamp: new Date(agreement.cancelled_date), type: "cancellation", description: "Loan was cancelled" });
  if (loan.status === "completed") activities.push({ timestamp: new Date(), type: "completion", description: "Loan repaid in full" });
  activities.sort((a, b) => a.timestamp - b.timestamp);

  const activityIconConfig = {
    created:      { bg: "rgba(3,172,234,0.12)",   stroke: "#03ACEA",  path: "M12 4v16m8-8H4", sz: 14, sw: 2 },
    signature:    { bg: "rgba(124,58,237,0.12)",  stroke: "#7C3AED",  path: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z", sz: 14, sw: 2 },
    payment:      { bg: "rgba(22,163,74,0.12)",   stroke: "#16A34A",  path: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1", sz: 17, sw: 2.5 },
    cancellation: { bg: "rgba(232,114,110,0.12)", stroke: "#E8726E",  path: "M6 18L18 6M6 6l12 12", sz: 14, sw: 2 },
    completion:   { bg: "rgba(22,163,74,0.12)",   stroke: "#16A34A",  path: "M5 13l4 4L19 7", sz: 14, sw: 2 },
  };

  // Payment rows
  const paymentRows = loanAnalysis ? loanAnalysis.periodResults.map(pr => {
    let status;
    if (pr.hasConfirmedPayments && pr.isFullPayment) status = "completed";
    else if (pr.hasAnyPayments && !pr.isPast) status = "partial";
    else if (pr.hasConfirmedPayments && !pr.isFullPayment) status = "partial";
    else if (pr.hasPendingPayments && !pr.hasConfirmedPayments) status = "pending";
    else if (pr.isPast && !pr.hasAnyPayments) status = "missed";
    else status = "upcoming";
    const expectedAmount = loanAnalysis.originalPaymentAmount || plannedPaymentAmount;
    const paidAmount = pr.actualPaid || 0;
    const paidPercentage = status === "completed" ? 100 : (status === "partial" && expectedAmount > 0) ? Math.min(99, (paidAmount / expectedAmount) * 100) : 0;
    return { number: pr.period, date: pr.date, amount: expectedAmount, paidAmount, paidPercentage, status };
  }) : [];

  // Amortization schedule
  const amortSchedule = agreement ? generateAmortizationSchedule(agreement) : [];

  // Signed date for header
  const signedDate = agreement?.lender_signed_date || agreement?.borrower_signed_date || loan.created_at;
  const signedDateFmt = signedDate ? format(new Date(signedDate), "MMMM d, yyyy") : "an unknown date";

  // Promissory note paragraph calculations (mirrors LoanAgreements.jsx)
  const pnFrequency = agreement?.payment_frequency || 'monthly';
  const pnRepaymentPeriod = parseInt(agreement?.repayment_period) || 0;
  const pnRepaymentUnit = agreement?.repayment_unit || 'months';
  const pnNumPayments = pnFrequency === 'weekly'
    ? Math.ceil(pnRepaymentPeriod * (pnRepaymentUnit === 'months' ? 4 : 1))
    : pnRepaymentPeriod;
  const pnSendFundsDate = agreement?.lender_send_funds_date
    ? new Date(agreement.lender_send_funds_date)
    : (agreement ? new Date(agreement.created_at) : new Date());
  const pnFirstPaymentDate = agreement?.first_payment_date
    ? new Date(agreement.first_payment_date)
    : (pnFrequency === 'weekly' ? addWeeks(pnSendFundsDate, 1) : addMonths(pnSendFundsDate, 1));
  let pnLastPaymentDate = null;
  if (pnNumPayments > 0) {
    pnLastPaymentDate = pnFrequency === 'weekly'
      ? addWeeks(pnFirstPaymentDate, pnNumPayments - 1)
      : addMonths(pnFirstPaymentDate, pnNumPayments - 1);
  } else if (agreement?.due_date) {
    pnLastPaymentDate = new Date(agreement.due_date);
  }
  const pnDayOfMonth = agreement?.loan_day_of_month
    ? parseInt(agreement.loan_day_of_month)
    : pnFirstPaymentDate.getDate();
  const pnDaySuffix = pnDayOfMonth === 1 ? 'st' : pnDayOfMonth === 2 ? 'nd' : pnDayOfMonth === 3 ? 'rd' : 'th';
  const pnDayOfWeek = agreement?.loan_day_of_week
    || ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][pnFirstPaymentDate.getDay()];
  const pnDayOfWeekLabel = pnDayOfWeek.charAt(0).toUpperCase() + pnDayOfWeek.slice(1);
  const pnTimeString = agreement?.loan_time || '12:00';
  const [pnHourStr, pnMinStr] = pnTimeString.split(':');
  const pnHour = parseInt(pnHourStr);
  const pnHour12 = pnHour === 0 ? 12 : pnHour > 12 ? pnHour - 12 : pnHour;
  const pnAmpm = pnHour >= 12 ? 'PM' : 'AM';
  const pnFormattedTime = `${pnHour12}:${pnMinStr || '00'} ${pnAmpm}`;
  const pnTimezone = agreement?.loan_timezone || 'EST';

  const C = 2 * Math.PI * 45;
  const ringOffset = C - (paidPct / 100) * C;

  // Shared styles
  const sectionWrap = { marginBottom: 40 };

  const docBox = {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.09)',
    borderRadius: 14,
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
    marginBottom: 40,
    overflow: 'hidden',
  };

  const docBoxHeader = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '13px 22px',
    borderBottom: '1px solid rgba(0,0,0,0.07)',
    background: '#FAFAF9',
  };

  const docBoxBody = { padding: '28px 28px 32px' };

  const sectionTitle = {
    fontSize: 13,
    fontWeight: 400,
    color: "#9B9A98",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0",
    marginBottom: 18,
    marginTop: 0,
  };

  const rowText = { fontSize: 15, fontWeight: 400, color: "#1A1918", fontFamily: "'DM Sans', sans-serif", margin: 0, lineHeight: 1.5 };
  const rowMeta = { fontSize: 13, color: "#9B9A98", fontFamily: "'DM Sans', sans-serif" };

  return (
    <>
      <MeshMobileNav user={currentUser} activePage={isLending ? "Lending" : "Borrowing"} />

      <div className="mesh-layout" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "200px 1fr", gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
        <DesktopSidebar />

        <div className="mesh-center loan-detail-center" style={{ background: "transparent", padding: "24px 28px 80px" }}>

          {/* ── Back button ── */}
          <button
            onClick={() => navigate(createPageUrl('YourLoans'))}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#9B9A98", fontSize: 14, fontFamily: "'DM Sans', sans-serif", padding: "0 0 28px", marginLeft: -4 }}
          >
            <ChevronLeft size={15} />
            Back
          </button>

          {/* ── Agreement header ── */}
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1918", margin: "0 0 12px", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.03em", lineHeight: 1.25 }}>
              Lending Agreement between {lenderName} and {borrowerName}
            </h1>
            <p style={{ fontSize: 15, color: "#5C5B5A", margin: 0, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
              On {signedDateFmt} both parties signed a lending agreement where{" "}
              {lenderName} agreed to lend {borrowerName}{" "}
              <span style={{ color: "#1A1918", fontWeight: 500 }}>{formatMoney(loan.amount || 0)}</span>
              {loan.purpose ? <> for {loan.purpose}</> : ""}.
            </p>
          </div>

          {/* ── Loan Overview ── */}
          <div style={sectionWrap}>
            <p style={sectionTitle}>Loan Overview</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Loan Amount", value: formatMoney(loan.amount || 0) },
                { label: "Interest Rate", value: `${loan.interest_rate || 0}%` },
                { label: "Term", value: `${loan.repayment_period || 0} ${loan.repayment_unit || "months"}` },
                { label: "Frequency", value: freqLabel },
                { label: "Total Owed Including Interest", value: formatMoney(totalOwedDisplay) },
                { label: isLending ? "Amount Received" : "Amount Paid", value: formatMoney(totalPaidAmt) },
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 15, color: "#787776", fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>{item.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#1A1918", fontFamily: "'DM Sans', sans-serif" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Payment History ── */}
          <div style={sectionWrap}>
            <p style={sectionTitle}>Payment History</p>
            {chartData.length === 0 ? (
              <p style={{ ...rowMeta, margin: 0 }}>No payment schedule yet</p>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: chartHeight }}>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingRight: 10, flexShrink: 0, height: "100%" }}>
                    <span style={rowMeta}>${maxChartVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <span style={rowMeta}>${Math.round(maxChartVal / 2).toLocaleString()}</span>
                    <span style={rowMeta}>$0</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "100%" }}>
                    {chartData.map((d, i) => {
                      const effectiveHeight = chartHeight - 14;
                      const barHeight = maxChartVal > 0 ? (d.amount / maxChartVal) * effectiveHeight : 0;
                      const scheduledBarHeight = maxChartVal > 0 && d.scheduledAmount ? (d.scheduledAmount / maxChartVal) * effectiveHeight : barHeight;
                      const isFullPmt = d.isPaid && d.isFullPayment;
                      const isPartialPmt = d.isPaid && !d.isFullPayment && !d.hasPendingOnly;
                      const isPendingOnly = d.hasPendingOnly;
                      const isInProgress = d.isInProgress;
                      return (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                            {isInProgress && !isFullPmt ? (
                              <div style={{ position: "relative", height: Math.max(scheduledBarHeight, 4), width: 16 }}>
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "100%", borderRadius: "3px 3px 0 0", background: "rgba(3,172,234,0.08)", border: "1px dashed rgba(3,172,234,0.2)" }} />
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: Math.max(barHeight, 4), borderRadius: "3px 3px 0 0", background: "#03ACEA" }} />
                              </div>
                            ) : (
                              <div style={{
                                borderRadius: "3px 3px 0 0",
                                height: Math.max(barHeight, d.amount > 0 ? 4 : 2), width: 16,
                                background: d.isProjected ? "rgba(84,166,207,0.25)" : d.isMissed ? "rgba(232,114,110,0.3)" : d.amount === 0 ? "#E5E4E2" : isPendingOnly ? "rgba(0,0,0,0.1)" : isFullPmt ? "#03ACEA" : isPartialPmt ? "rgba(245,158,11,0.55)" : "rgba(3,172,234,0.25)",
                                border: d.isProjected ? "1px dashed rgba(84,166,207,0.4)" : d.isMissed ? "1px dashed rgba(232,114,110,0.4)" : isPendingOnly ? "1px dashed rgba(0,0,0,0.12)" : "none",
                              }} />
                            )}
                          </div>
                          <span style={{ fontSize: 10, marginTop: 5, lineHeight: 1, color: isInProgress ? "#03ACEA" : d.isProjected ? "#54A6CF" : d.isMissed ? "#E8726E" : isPendingOnly ? "#9B9A98" : "#787776" }}>{d.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
                  {[
                    { label: "Completed", color: "#03ACEA", dashed: false },
                    { label: "Pending",   color: "rgba(0,0,0,0.15)", dashed: true },
                    { label: "Expected",  color: "rgba(84,166,207,0.4)", dashed: true },
                    { label: "Missed",    color: "rgba(232,114,110,0.4)", dashed: true },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: l.dashed ? "transparent" : l.color, border: l.dashed ? `1px dashed ${l.color}` : "none", flexShrink: 0 }} />
                      <span style={{ ...rowMeta, fontSize: 12 }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Payments — timeline style ── */}
          <div style={sectionWrap}>
            <p style={sectionTitle}>Payments</p>
            {paymentRows.length === 0 ? (
              <p style={{ ...rowMeta, margin: 0 }}>No payments scheduled</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {paymentRows.map((row, idx) => {
                  const statusColors = {
                    completed: "#16A34A",
                    partial:   "#03ACEA",
                    pending:   "#9B9A98",
                    missed:    "#E8726E",
                    upcoming:  "#C7C6C4",
                  };
                  const statusLabels = { completed: "Completed", partial: "Partial", pending: "Pending", missed: "Missed", upcoming: "Upcoming" };
                  const dotColor = statusColors[row.status] || "#C7C6C4";
                  return (
                    <div key={row.number} style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative" }}>
                      {/* connecting line */}
                      {idx < paymentRows.length - 1 && (
                        <div style={{ position: "absolute", left: 4, top: 18, width: 1, bottom: -6, background: "rgba(0,0,0,0.08)" }} />
                      )}
                      {/* dot */}
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: 5 }} />
                      {/* content */}
                      <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 18 }}>
                        <div>
                          <p style={rowText}>Payment {row.number} · {formatMoney(row.amount)}</p>
                          {row.status === "partial" && row.paidAmount > 0 && (
                            <p style={{ ...rowMeta, fontSize: 13, marginTop: 2 }}>
                              Paid {formatMoney(row.paidAmount)} · {formatMoney(Math.max(0, row.amount - row.paidAmount))} remaining
                            </p>
                          )}
                          {row.status === "completed" && (
                            <p style={{ fontSize: 13, color: "#16A34A", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>Paid {formatMoney(row.paidAmount)}</p>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                          <p style={rowMeta}>{format(row.date, "MMM d, yyyy")}</p>
                          <p style={{ fontSize: 12, color: dotColor, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>{statusLabels[row.status]}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Activity — timeline style matching screenshot ── */}
          <div style={sectionWrap}>
            <p style={sectionTitle}>Activity</p>
            {activities.length === 0 ? (
              <p style={{ ...rowMeta, margin: 0 }}>No activity recorded yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {activities.map((activity, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative" }}>
                    {idx < activities.length - 1 && (
                      <div style={{ position: "absolute", left: 4, top: 18, width: 1, bottom: -6, background: "rgba(0,0,0,0.08)" }} />
                    )}
                    {/* small grey dot */}
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#C7C6C4", flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 20 }}>
                      <div style={{ flex: 1, paddingRight: 16 }}>
                        <p style={rowText}>{activity.description}</p>
                        {activity.isAwaitingConfirmation && (
                          <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, color: "#F59E0B", fontFamily: "'DM Sans', sans-serif" }}>Awaiting confirmation</span>
                        )}
                      </div>
                      <p style={{ ...rowMeta, flexShrink: 0 }}>{format(activity.timestamp, "MMM d, HH:mm")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Promissory Note ── */}
          {agreement && (
            <div style={docBox}>
              <div style={docBoxHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <FileText size={13} style={{ color: "#9B9A98" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1918", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.01em" }}>Promissory Note</span>
                </div>
                <span style={{ fontSize: 12, color: "#9B9A98", fontFamily: "'DM Sans', sans-serif" }}>Legal document</span>
              </div>

              <div style={docBoxBody}>
              {/* Principal */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ ...rowMeta, marginBottom: 2 }}>Principal amount</p>
                <p style={{ fontSize: 22, fontWeight: 600, color: "#1A1918", margin: 0, letterSpacing: "-0.02em", fontFamily: "'DM Sans', sans-serif" }}>{formatMoney(agreement.amount)}</p>
              </div>

              {/* Agreement paragraph */}
              <p style={{ fontSize: 15, lineHeight: 1.75, color: "#1A1918", margin: "0 0 24px", fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                The lender agrees to lend <strong>{borrowerName}</strong> <strong>{formatMoney(agreement.amount)}</strong> before <strong>{format(pnSendFundsDate, 'MMM d, yyyy')}</strong> at an interest rate of <strong>{agreement.interest_rate || 0}%</strong>. The loan will be repaid over <strong>{pnRepaymentPeriod} {pnRepaymentUnit}</strong> in <strong>{pnFrequency}</strong> payments of <strong>{formatMoney(agreement.payment_amount)}</strong>. Payments will be due {pnFrequency === 'weekly' ? <>on <strong>{pnDayOfWeekLabel}</strong></> : <>on the <strong>{pnDayOfMonth}{pnDaySuffix}</strong></>} at <strong>{pnFormattedTime} {pnTimezone}</strong>, with the first of the <strong>{pnNumPayments}</strong> payments due on <strong>{format(pnFirstPaymentDate, 'MMM d, yyyy')}</strong> and the last payment due on <strong>{pnLastPaymentDate ? format(pnLastPaymentDate, 'MMM d, yyyy') : '—'}</strong>.{agreement.purpose ? <> This loan is for <strong>{agreement.purpose}</strong>.</> : ''}
              </p>

              {/* Terms — same label/value style as Loan Overview */}
              <p style={{ ...sectionTitle, marginBottom: 14 }}>Terms of repayment</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                {[
                  { label: "Total amount due", value: formatMoney(agreement.total_amount) },
                  { label: "Interest rate", value: `${agreement.interest_rate || 0}%` },
                  { label: "Payment amount", value: `${formatMoney(agreement.payment_amount)} ${agreement.payment_frequency}` },
                  { label: "Term", value: `${agreement.repayment_period} ${agreement.repayment_unit || "months"}` },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 15, color: "#787776", fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "#1A1918", fontFamily: "'DM Sans', sans-serif" }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Signatures */}
              <p style={{ ...sectionTitle, marginBottom: 14 }}>Signatures</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {[
                  { role: "Lender",   name: agreement.lender_name   || lenderName,   signed: agreement.lender_signed_date },
                  { role: "Borrower", name: agreement.borrower_name || borrowerName, signed: agreement.borrower_signed_date },
                ].map((sig, idx) => (
                  <div key={idx}>
                    {/* Generated cursive signature */}
                    <div style={{
                      background: "#F9F8F6",
                      borderRadius: 10,
                      padding: "12px 16px 10px",
                      marginBottom: 10,
                      borderBottom: "1.5px solid #1A1918",
                      display: "inline-block",
                      minWidth: 180,
                    }}>
                      <span style={{
                        fontSize: 26,
                        fontFamily: "'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive",
                        color: "#1A1918",
                        letterSpacing: "0.02em",
                        lineHeight: 1.2,
                        display: "block",
                      }}>
                        {sig.name}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#9B9A98", margin: "0 0 1px", fontFamily: "'DM Sans', sans-serif" }}>{sig.role}</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1918", margin: "0 0 1px", fontFamily: "'DM Sans', sans-serif" }}>{sig.name}</p>
                    {sig.signed && (
                      <p style={{ fontSize: 13, color: "#9B9A98", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Signed {formatTZ(sig.signed, "MMM d, yyyy")}</p>
                    )}
                  </div>
                ))}
              </div>
              </div>{/* end docBoxBody */}
            </div>
          )}

          {/* ── Amortization Table ── */}
          {amortSchedule.length > 0 && (
            <div style={docBox}>
              <div style={docBoxHeader}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1918", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.01em" }}>Amortization table</span>
              </div>

              <div style={docBoxBody}>
              {/* Summary rows — same label/value style */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                {[
                  { label: "Principal", value: formatMoney(agreement?.amount || loan.amount || 0) },
                  { label: "Total interest", value: formatMoney((agreement?.total_amount || 0) - (agreement?.amount || 0)) },
                  { label: "Total repayment", value: formatMoney(agreement?.total_amount || 0) },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 15, color: "#787776", fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "#1A1918", fontFamily: "'DM Sans', sans-serif" }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", minWidth: 640 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                      {["#", "Date", "Starting Balance", "Principal", "Interest", "Principal to Date", "Interest to Date", "Ending Balance"].map((h, i) => (
                        <th key={i} style={{ padding: "8px 10px 10px", textAlign: i <= 1 ? "left" : "right", fontWeight: 400, color: "#9B9A98", fontSize: 13, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {amortSchedule.map((row, index) => {
                      const isPaid = index < fullPaymentCount;
                      return (
                        <tr key={row.number} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", opacity: isPaid ? 1 : 0.7 }}>
                          <td style={{ padding: "10px 10px", color: "#9B9A98", fontSize: 13 }}>{row.number}</td>
                          <td style={{ padding: "10px 10px", color: "#1A1918", whiteSpace: "nowrap", fontSize: 13 }}>{format(row.date, "MMM d, yyyy")}</td>
                          <td style={{ padding: "10px 10px", textAlign: "right", color: "#787776", fontSize: 13 }}>{formatMoney(row.startingBalance)}</td>
                          <td style={{ padding: "10px 10px", textAlign: "right", color: isPaid ? "#1A1918" : "#787776", fontWeight: isPaid ? 500 : 400, fontSize: 13 }}>{formatMoney(row.principal)}</td>
                          <td style={{ padding: "10px 10px", textAlign: "right", color: "#787776", fontSize: 13 }}>{formatMoney(row.interest)}</td>
                          <td style={{ padding: "10px 10px", textAlign: "right", color: "#787776", fontSize: 13 }}>{formatMoney(row.principalToDate)}</td>
                          <td style={{ padding: "10px 10px", textAlign: "right", color: "#787776", fontSize: 13 }}>{formatMoney(row.interestToDate)}</td>
                          <td style={{ padding: "10px 10px", textAlign: "right", color: "#1A1918", fontWeight: 500, fontSize: 13 }}>{formatMoney(row.endingBalance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>{/* end docBoxBody */}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

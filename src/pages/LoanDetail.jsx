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
        <button onClick={() => navigate(-1)} style={{ fontSize: 13, color: "#03ACEA", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Go back</button>
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

  const C = 2 * Math.PI * 45;
  const ringOffset = C - (paidPct / 100) * C;

  // Only Promissory Note and Amortization Table get the card treatment
  const docCardStyle = {
    background: "#FEFEFE",
    borderRadius: 3,
    border: "none",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
    padding: "22px 24px",
    marginBottom: 32,
  };

  // Plain section wrapper — no box
  const sectionWrap = { marginBottom: 36 };

  const sectionTitle = {
    fontSize: 12,
    fontWeight: 700,
    color: "#9B9A98",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "-0.01em",
    marginBottom: 16,
    marginTop: 0,
  };

  return (
    <>
      <style>{`
        @media (min-width: 901px) {
          .loan-detail-center { padding-left: 160px !important; padding-right: 160px !important; }
        }
      `}</style>

      <MeshMobileNav user={currentUser} activePage={isLending ? "Lending" : "Borrowing"} />

      <div className="mesh-layout" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "200px 1fr", gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
        <DesktopSidebar />

        <div className="mesh-center loan-detail-center" style={{ background: "transparent", padding: "24px 28px 80px" }}>

          {/* ── Back button ── */}
          <button
            onClick={() => navigate(-1)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#787776", fontSize: 13, fontFamily: "'DM Sans', sans-serif", padding: "0 0 24px", marginLeft: -4 }}
          >
            <ChevronLeft size={16} />
            Back
          </button>

          {/* ── Agreement header ── */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1918", margin: "0 0 10px", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.03em" }}>
              Lending Agreement between {lenderName} and {borrowerName}
            </h1>
            <p style={{ fontSize: 14, color: "#5C5B5A", margin: 0, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
              On {signedDateFmt} both parties signed a lending agreement where{" "}
              <strong style={{ color: "#1A1918" }}>{lenderName}</strong> agreed to lend{" "}
              <strong style={{ color: "#1A1918" }}>{borrowerName}</strong>{" "}
              <strong style={{ color: accent }}>{formatMoney(loan.amount || 0)}</strong>
              {loan.purpose ? (
                <> for <strong style={{ color: "#1A1918" }}>{loan.purpose}</strong></>
              ) : ""}.
            </p>
          </div>

          {/* ── Loan Overview — single column, no lines, no box ── */}
          <div style={sectionWrap}>
            <p style={sectionTitle}>Loan Overview</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Loan Amount", value: formatMoney(loan.amount || 0) },
                { label: "Interest Rate", value: `${loan.interest_rate || 0}%` },
                { label: "Term", value: `${loan.repayment_period || 0} ${loan.repayment_unit || "months"}` },
                { label: "Frequency", value: freqLabel },
                { label: "Total Owed Including Interest", value: formatMoney(totalOwedDisplay) },
                { label: isLending ? "Amount Received" : "Amount Paid", value: formatMoney(totalPaidAmt) },
                { label: "Payments Made", value: `${fullPaymentCount}/${totalPeriods}` },
                { label: `${freqLabel} Payments`, value: formatMoney(displayPaymentAmt) },
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 14, color: "#787776", fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1918", fontFamily: "'DM Sans', sans-serif" }}>{item.value}</span>
                    {item.sub && <p style={{ fontSize: 10, color: "#9B9A98", margin: "1px 0 0", fontFamily: "'DM Sans', sans-serif" }}>{item.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Repayment ring — no box ── */}
          <div style={{ ...sectionWrap, display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
              <svg width="80" height="80" viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="64" cy="64" r="45" fill="none" stroke={`${accent}26`} strokeWidth="10" />
                <circle cx="64" cy="64" r="45" fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={ringOffset} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1A1918", letterSpacing: "-0.03em", fontFamily: "'DM Sans', sans-serif" }}>{paidPct}%</span>
                <span style={{ fontSize: 9, fontWeight: 500, color: "#787776", fontFamily: "'DM Sans', sans-serif" }}>repaid</span>
              </div>
            </div>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: accent, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em" }}>
                {formatMoney(remaining)} remaining
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#787776", fontFamily: "'DM Sans', sans-serif" }}>
                {formatMoney(totalPaidAmt)} of {formatMoney(totalWithInterest)} {isLending ? "repaid to you" : "paid back"}
              </p>
            </div>
          </div>

          {/* ── Payment History bar chart — no box ── */}
          <div style={sectionWrap}>
            <p style={sectionTitle}>Payment History</p>
            {chartData.length === 0 ? (
              <p style={{ fontSize: 12, color: "#C7C6C4", margin: 0 }}>No payment schedule yet</p>
            ) : (
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: chartHeight }}>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingRight: 8, flexShrink: 0, height: "100%" }}>
                    <p style={{ fontSize: 10, color: "#787776", margin: 0 }}>${maxChartVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <p style={{ fontSize: 10, color: "#787776", margin: 0 }}>${Math.round(maxChartVal / 2).toLocaleString()}</p>
                    <p style={{ fontSize: 10, color: "#787776", margin: 0 }}>$0</p>
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
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "100%", borderRadius: "4px 4px 0 0", background: "rgba(3,172,234,0.08)", border: "1px dashed rgba(3,172,234,0.2)" }} />
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: Math.max(barHeight, 4), borderRadius: "4px 4px 0 0", background: "#03ACEA" }} />
                              </div>
                            ) : (
                              <div style={{
                                borderRadius: "4px 4px 0 0", transition: "all 0.3s",
                                height: Math.max(barHeight, d.amount > 0 ? 4 : 2), width: 16,
                                background: d.isProjected ? "rgba(84,166,207,0.28)" : d.isMissed ? "rgba(232,114,110,0.3)" : d.amount === 0 ? "#E5E4E2" : isPendingOnly ? "rgba(0,0,0,0.1)" : isFullPmt ? "#03ACEA" : isPartialPmt ? "rgba(245,158,11,0.6)" : "rgba(3,172,234,0.25)",
                                border: d.isProjected ? "1px dashed rgba(84,166,207,0.5)" : d.isMissed ? "1px dashed rgba(232,114,110,0.5)" : isPendingOnly ? "1px dashed rgba(0,0,0,0.15)" : "none",
                              }} />
                            )}
                          </div>
                          <p style={{ fontSize: 10, marginTop: 5, lineHeight: 1, color: isInProgress ? "#03ACEA" : d.isProjected ? "#54A6CF" : d.isMissed ? "#E8726E" : isPendingOnly ? "#9B9A98" : "#4B4A48" }}>{d.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Legend */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "#03ACEA" }} /><span style={{ fontSize: 11, color: "#787776" }}>Completed</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(0,0,0,0.1)", border: "1px dashed rgba(0,0,0,0.15)" }} /><span style={{ fontSize: 11, color: "#787776" }}>Pending</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(84,166,207,0.28)", border: "1px dashed rgba(84,166,207,0.5)" }} /><span style={{ fontSize: 11, color: "#787776" }}>Expected</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(232,114,110,0.3)", border: "1px dashed rgba(232,114,110,0.5)" }} /><span style={{ fontSize: 11, color: "#787776" }}>Missed</span></div>
                </div>
              </div>
            )}
          </div>

          {/* ── Payments list — no box, no row lines ── */}
          <div style={sectionWrap}>
            <p style={sectionTitle}>Payments</p>
            {paymentRows.length === 0 ? (
              <p style={{ fontSize: 12, color: "#C7C6C4", margin: 0 }}>No payments scheduled</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {paymentRows.map(row => {
                  const statusConfig = {
                    completed: { label: "Completed", color: "#16A34A", bg: "rgba(22,163,74,0.1)" },
                    partial:   { label: "Partial",   color: "#0288CE", bg: "rgba(3,172,234,0.1)" },
                    pending:   { label: "Pending",   color: "#9B9A98", bg: "rgba(0,0,0,0.05)" },
                    missed:    { label: "Missed",    color: "#E8726E", bg: "rgba(232,114,110,0.1)" },
                    upcoming:  { label: "Upcoming",  color: "#787776", bg: "rgba(0,0,0,0.03)" },
                  };
                  const cfg = statusConfig[row.status] || statusConfig.upcoming;
                  const r2 = row.amount > 0 ? (row.paidAmount / row.amount) : 0;
                  const circ = 2 * Math.PI * 12;
                  const dash = r2 * circ;
                  return (
                    <div key={row.number} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Pie circle */}
                      <svg width="30" height="30" viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
                        <circle cx="15" cy="15" r="12" fill="none" stroke="#E5E4E2" strokeWidth="4" />
                        {row.paidAmount > 0 && (
                          <circle cx="15" cy="15" r="12" fill="none" stroke="#03ACEA" strokeWidth="4"
                            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                            transform="rotate(-90 15 15)" />
                        )}
                        <text x="15" y="15" textAnchor="middle" dominantBaseline="central" fill="#1A1918" fontSize="9" fontWeight="bold" fontFamily="'DM Sans', sans-serif">{row.number}</text>
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "#1A1918", margin: 0 }}>
                            Payment {row.number}: {formatMoney(row.amount)}
                          </p>
                          <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.bg, borderRadius: 5, padding: "2px 7px", flexShrink: 0 }}>{cfg.label}</span>
                        </div>
                        {row.status === "partial" && row.paidAmount > 0 && (
                          <p style={{ fontSize: 12, margin: "2px 0 0", color: "#787776" }}>
                            Paid: <strong style={{ color: "#15803D" }}>{formatMoney(row.paidAmount)}</strong>
                            <span style={{ margin: "0 6px" }}>·</span>
                            Remaining: <strong style={{ color: "#03ACEA" }}>{formatMoney(Math.max(0, row.amount - row.paidAmount))}</strong>
                          </p>
                        )}
                        {row.status !== "partial" && row.paidAmount > 0 && (
                          <p style={{ fontSize: 12, margin: "2px 0 0", fontWeight: 700, color: "#15803D" }}>Paid: {formatMoney(row.paidAmount)}</p>
                        )}
                        <p style={{ fontSize: 11, color: "#9B9A98", margin: "2px 0 0" }}>Due: {format(row.date, "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Activity timeline — no box ── */}
          <div style={sectionWrap}>
            <p style={sectionTitle}>Activity</p>
            {activities.length === 0 ? (
              <p style={{ fontSize: 12, color: "#C7C6C4", margin: 0 }}>No activity recorded yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {activities.map((activity, idx) => {
                  const cfg = activityIconConfig[activity.type] || activityIconConfig.created;
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 12, position: "relative" }}>
                      {idx < activities.length - 1 && (
                        <div style={{ position: "absolute", left: 13, top: 30, width: 1, bottom: -8, background: "rgba(84,166,207,0.2)" }} />
                      )}
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", zIndex: 1, marginTop: 4 }}>
                        <svg width={cfg.sz} height={cfg.sz} fill="none" viewBox="0 0 24 24" stroke={cfg.stroke} strokeWidth={cfg.sw}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={cfg.path} />
                        </svg>
                      </div>
                      <div style={{ flex: 1, paddingBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "#1A1918", margin: 0, lineHeight: 1.45 }}>{activity.description}</p>
                          {activity.isAwaitingConfirmation && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 4, padding: "2px 5px", whiteSpace: "nowrap" }}>Awaiting Confirmation</span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: "#9B9A98", margin: "3px 0 0" }}>
                          {format(activity.timestamp, "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Promissory Note — keeps card style ── */}
          {agreement && (
            <div style={docCardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <p style={{ ...sectionTitle, marginBottom: 0 }}>Promissory Note</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={14} style={{ color: "#9B9A98" }} />
                  <span style={{ fontSize: 10, color: "#9B9A98", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Legal Document</span>
                </div>
              </div>

              <div style={{ background: "rgba(3,172,234,0.06)", borderRadius: 10, border: "1px solid rgba(3,172,234,0.15)", padding: "12px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: "#787776", margin: "0 0 3px" }}>Principal Amount</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: accent, margin: 0, letterSpacing: "-0.03em" }}>{formatMoney(agreement.amount)}</p>
              </div>

              <p style={{ fontSize: 13, lineHeight: 1.75, color: "#1A1918", margin: "0 0 16px" }}>
                <strong>{lenderName}</strong> agrees to lend <strong>{borrowerName}</strong> <strong>{formatMoney(agreement.amount)}</strong>
                {agreement.purpose ? <>, for <strong>{agreement.purpose}</strong>,</> : ","} with <strong>{agreement.interest_rate || 0}%</strong> interest per annum.{" "}
                <strong>{borrowerName}</strong> agrees to repay <strong>{formatMoney(agreement.total_amount)}</strong> in{" "}
                <strong>{agreement.payment_frequency}</strong> instalments of <strong>{formatMoney(agreement.payment_amount)}</strong> over{" "}
                <strong>{agreement.repayment_period} {agreement.repayment_unit || "months"}</strong>.
              </p>

              <div style={{ background: "rgba(0,0,0,0.02)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)", padding: "12px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#1A1918", margin: "0 0 10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Terms of Repayment</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Total Amount Due", value: formatMoney(agreement.total_amount) },
                    { label: "Interest Rate", value: `${agreement.interest_rate || 0}%` },
                    { label: "Payment Amount", value: `${formatMoney(agreement.payment_amount)} ${agreement.payment_frequency}` },
                    { label: "Term", value: `${agreement.repayment_period} ${agreement.repayment_unit || "months"}` },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <span style={{ fontSize: 11, color: "#787776" }}>{item.label}: </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1918" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "rgba(0,0,0,0.02)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)", padding: "12px 14px" }}>
                  <p style={{ fontSize: 10, color: "#787776", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Borrower</p>
                  <p style={{ fontSize: 14, fontStyle: "italic", color: "#1A1918", margin: 0 }}>{agreement.borrower_name || borrowerName}</p>
                  {agreement.borrower_signed_date && (
                    <p style={{ fontSize: 11, color: "#787776", margin: "4px 0 0" }}>Signed {formatTZ(agreement.borrower_signed_date, "MMM d, yyyy")}</p>
                  )}
                </div>
                <div style={{ background: "rgba(0,0,0,0.02)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)", padding: "12px 14px" }}>
                  <p style={{ fontSize: 10, color: "#787776", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lender</p>
                  <p style={{ fontSize: 14, fontStyle: "italic", color: "#1A1918", margin: 0 }}>{agreement.lender_name || lenderName}</p>
                  {agreement.lender_signed_date && (
                    <p style={{ fontSize: 11, color: "#787776", margin: "4px 0 0" }}>Signed {formatTZ(agreement.lender_signed_date, "MMM d, yyyy")}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Amortization Table — keeps card style ── */}
          {amortSchedule.length > 0 && (
            <div style={docCardStyle}>
              <p style={sectionTitle}>Amortization Table</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Principal", value: formatMoney(agreement?.amount || loan.amount || 0) },
                  { label: "Total Interest", value: formatMoney((agreement?.total_amount || 0) - (agreement?.amount || 0)) },
                  { label: "Total Repayment", value: formatMoney(agreement?.total_amount || 0) },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: "rgba(0,0,0,0.02)", borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)", padding: "10px 14px", textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: "#787776", margin: "0 0 4px" }}>{item.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#1A1918", margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid rgba(0,0,0,0.07)" }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", minWidth: 640 }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                      {["#", "Date", "Starting Balance", "Principal", "Interest", "Principal to Date", "Interest to Date", "Ending Balance"].map((h, i) => (
                        <th key={i} style={{ padding: "8px 10px", textAlign: i <= 1 ? "left" : "right", fontWeight: 600, color: "#787776", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {amortSchedule.map((row, index) => {
                      const isPaid = index < fullPaymentCount;
                      return (
                        <tr key={row.number} style={{ background: isPaid ? "rgba(3,172,234,0.05)" : "transparent", borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                          <td style={{ padding: "7px 10px", color: "#787776" }}>{row.number}</td>
                          <td style={{ padding: "7px 10px", color: "#1A1918", whiteSpace: "nowrap" }}>{format(row.date, "MMM d, yyyy")}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", color: "#787776" }}>{formatMoney(row.startingBalance)}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 500, color: "#1A1918" }}>{formatMoney(row.principal)}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", color: "#787776" }}>{formatMoney(row.interest)}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", color: "#787776" }}>{formatMoney(row.principalToDate)}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", color: "#787776" }}>{formatMoney(row.interestToDate)}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 500, color: "#1A1918" }}>{formatMoney(row.endingBalance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

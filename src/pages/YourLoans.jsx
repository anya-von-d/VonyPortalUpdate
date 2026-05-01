import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, User, LoanAgreement, PublicProfile } from "@/entities/all";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock, Calendar, DollarSign, FileText, X, ChevronRight, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, addMonths, addWeeks, startOfMonth, endOfMonth } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import { todayInTZ, formatTZ } from "@/components/utils/timezone";
import LoanDetailsModal from "@/components/loans/LoanDetailsModal";
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";
import DesktopSidebar from '../components/DesktopSidebar';

export default function YourLoans({ defaultTab, embeddedMode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = defaultTab || searchParams.get('tab') || 'lending';
  const setActiveTab = (tab) => setSearchParams({ tab });
  const [allLoans, setAllLoans] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [, setLoanAgreements] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loanToCancel, setLoanToCancel] = useState(null);
  const [manageLoanSelected, setManageLoanSelected] = useState(null);
  const [rankingFilterLending, setRankingFilterLending] = useState('status');
  const [rankingFilterBorrowing, setRankingFilterBorrowing] = useState('status');
  const [activeDocPopup, setActiveDocPopup] = useState(null);
  const [docPopupAgreement, setDocPopupAgreement] = useState(null);
  const [, setReminderSlide] = useState(0);
  const [carouselSlide, setCarouselSlide] = useState(0);
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
    setCarouselSlide(0);
  }, [activeTab]);
  useEffect(() => {
    if (allOverdueForEffect.length <= 1) return;
    const timer = setInterval(() => setReminderSlide(prev => (prev + 1) % allOverdueForEffect.length), 8000);
    return () => clearInterval(timer);
  }, [allOverdueForEffect.length]);

  // --- Lending summary stats ---
  const totalExpectedLending = activeLendingLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
  const totalReceivedLending = activeLendingLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);

  // --- Borrowing summary stats ---
  const totalOwedBorrowing = activeBorrowingLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
  const totalPaidBorrowing = activeBorrowingLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);

  // --- Shared helpers ---
  const getUserById = (userId) => {
    const profile = publicProfiles.find(p => p.user_id === userId);
    return profile || { username: 'user', full_name: 'Unknown User' };
  };

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
            {agreement.borrower_signed_date && <p style={{ fontSize: 11, color: '#787776', margin: '4px 0 0' }}>Signed {formatTZ(agreement.borrower_signed_date, 'MMM d, yyyy')}</p>}
          </div>
          <div style={{ background: 'transparent', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)', padding: 14 }}>
            <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px' }}>Lender</p>
            <p style={{ fontSize: 13, fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif", color: '#1A1918', margin: 0 }}>{agreement.lender_name || lenderInfo.full_name}</p>
            {agreement.lender_signed_date && <p style={{ fontSize: 11, color: '#787776', margin: '4px 0 0' }}>Signed {formatTZ(agreement.lender_signed_date, 'MMM d, yyyy')}</p>}
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
              <div><p style={{ color: '#787776', margin: 0 }}>Due Date</p><p style={{ fontWeight: 600, color: '#1A1918', margin: 0 }}>{agreement.due_date ? format(toLocalDate(agreement.due_date), 'MMM d, yyyy') : 'N/A'}</p></div>
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

  // --- Reusable Summary Tab Renderer ---
  const renderSummaryTab = (type) => {
    const isLending = type === 'lending';
    const activeLoans = isLending ? activeLendingLoans : activeBorrowingLoans;
    const accent = isLending ? '#03ACEA' : '#1D5B94';
    const otherKey = isLending ? 'borrower_id' : 'lender_id';

    // Build card data for carousel
    const loanCards = activeLoans.map(loan => {
      const profile = publicProfiles.find(p => p.user_id === loan[otherKey]);
      const name = profile?.full_name?.split(' ')[0] || profile?.username || 'User';
      const remaining = Math.max(0, (loan.total_amount || loan.amount || 0) - (loan.amount_paid || 0));
      return { loan, profile, name, remaining };
    });

    const rankingFilter = isLending ? rankingFilterLending : rankingFilterBorrowing;
    const setRankingFilter = isLending ? setRankingFilterLending : setRankingFilterBorrowing;

    const borrowOwed = Math.max(0, totalOwedBorrowing - totalPaidBorrowing);
    const lentOwed   = Math.max(0, totalExpectedLending - totalReceivedLending);

    return (
      <>
        {/* ── Summary slides: peek carousel (mobile) / 4-col grid (desktop) ── */}
        <div
          className="summary-slides-outer"
          style={{ marginBottom: 8 }}
          onScroll={(e) => {
            const el = e.currentTarget;
            const cardWidth = el.firstElementChild?.offsetWidth || 1;
            setCarouselSlide(Math.min(3, Math.round(el.scrollLeft / (cardWidth + 12))));
          }}
        >

          {/* Card 1: Owed breakdown */}
          {(() => {
            const SLIDE_COLORS = isLending
              ? ['#7FD9FF', '#3DC4F5', '#03ACEA', '#0291C0', '#027AA3', '#1D5B94']
              : ['#C8C7C5', '#A8A7A5', '#888786', '#686765', '#4A4948', '#2C2B2A'];
            const totalOwed = isLending ? lentOwed : borrowOwed;
            const sortedCards = [...loanCards].sort((a, b) => b.remaining - a.remaining);
            return (
              <div className="summary-slide-card">
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
                  {isLending ? "You're owed" : "You owe"}
                </div>
                <div style={{ fontSize: 34, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.04em', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.05, marginBottom: 14 }}>
                  {formatMoney(totalOwed)}
                </div>
                {sortedCards.length > 0 && totalOwed > 0 ? (
                  <>
                    <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 10, marginBottom: 14, gap: 2 }}>
                      {sortedCards.map((card, i) => {
                        const pct = (card.remaining / totalOwed) * 100;
                        return <div key={i} style={{ flex: pct, background: SLIDE_COLORS[i % SLIDE_COLORS.length], minWidth: pct > 0 ? 4 : 0, borderRadius: 3 }} />;
                      })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {sortedCards.map((card, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: SLIDE_COLORS[i % SLIDE_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", flex: 1 }}>{card.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{formatMoney(card.remaining)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>No active loans</div>
                )}
              </div>
            );
          })()}

          {/* Card 2: Repaid */}
          {(() => {
            const today2 = todayInTZ();
            const overdueCount = activeLoans.filter(l => l.next_payment_date && toLocalDate(l.next_payment_date) < today2).length;
            const insightText = activeLoans.length === 0
              ? (isLending ? 'No active loans yet' : 'You have no active borrowing')
              : overdueCount > 1
                ? (isLending ? `${overdueCount} borrowers are behind on payments` : `${overdueCount} payments need your attention`)
                : overdueCount === 1
                  ? (isLending ? 'One borrower is behind — follow up when ready' : "One quick payment and you're back on track")
                  : (isLending ? 'All your lent money is on track' : 'All your payments are on track');
            return (
              <div className="summary-slide-card">
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
                  {isLending ? 'Repaid to you' : 'Paid back'}
                </div>
                <div style={{ fontSize: 34, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.04em', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.05, marginBottom: 3 }}>
                  {formatMoney(isLending ? totalReceivedLending : totalPaidBorrowing)}
                </div>
                <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", marginBottom: 20 }}>
                  of {formatMoney(isLending ? totalExpectedLending : totalOwedBorrowing)} {isLending ? 'repaid to you' : 'paid back'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: accent, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
                  {insightText}
                </div>
              </div>
            );
          })()}

          {/* Card 3: Monthly gauge */}
          {(() => {
            const monthlyPaidCount = activeLoans.filter(loan =>
              allPayments.some(p => {
                if (p.loan_id !== loan.id) return false;
                if (p.status !== 'confirmed' && p.status !== 'completed') return false;
                const d = p.payment_date ? toLocalDate(p.payment_date) : toLocalDate(p.created_at);
                return d >= monthStart && d <= monthEnd;
              })
            ).length;
            const totalCount = activeLoans.length;
            const cx = 90, cy = 85, r = 68;
            const circ = Math.PI * r;
            const pct = totalCount > 0 ? monthlyPaidCount / totalCount : 0;
            return (
              <div className="summary-slide-card">
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
                  This month
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                  <div style={{ position: 'relative', width: 180, height: 104 }}>
                    <svg width="180" height="104" viewBox="0 0 180 104" style={{ display: 'block' }}>
                      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`} fill="none" stroke={`${accent}22`} strokeWidth="11" strokeLinecap="round" />
                      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`} fill="none" stroke={accent} strokeWidth="11" strokeLinecap="round"
                        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - pct)}
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                      {totalCount > 0 && Array.from({ length: totalCount }).map((_, i) => {
                        const angle = Math.PI * (1 - (i + 0.5) / totalCount);
                        const dx = cx + r * Math.cos(angle);
                        const dy = cy - r * Math.sin(angle);
                        return <circle key={i} cx={dx} cy={dy} r={5} fill={i < monthlyPaidCount ? accent : `${accent}30`} />;
                      })}
                    </svg>
                    <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 24, fontWeight: 700, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {monthlyPaidCount} <span style={{ fontSize: 14, fontWeight: 500, color: '#9B9A98' }}>of {totalCount}</span>
                      </span>
                      <span style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                        {isLending ? 'payments received' : 'payments made'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginBottom: 1 }}>{isLending ? 'Expecting' : 'Due'}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
                      {formatMoney(isLending ? monthlyExpectedReceive : monthlyExpectedPay)}
                    </div>
                  </div>
                  {(isLending ? monthlyReceived : monthlyPaidOut) > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginBottom: 1 }}>{isLending ? 'Received' : 'Paid'}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: accent, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
                        {formatMoney(isLending ? monthlyReceived : monthlyPaidOut)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Card 4: Upcoming */}
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
              <div className="summary-slide-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>Upcoming</div>
                  <Link to={createPageUrl('Upcoming')} style={{ fontSize: 12, fontWeight: 500, color: accent, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>Full schedule →</Link>
                </div>
                {firstDays !== null && (
                  <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
                    Next payment {nextLabel}
                  </div>
                )}
                {combined.length === 0 ? (
                  <div style={{ padding: '16px 0', fontSize: 13, color: '#787776', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>You're all caught up! 🎉</div>
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

        </div>

        {/* Dots — mobile only, controlled by scroll position */}
        <div className="summary-slides-dots" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: carouselSlide === i ? '#1A1918' : '#D4D3D1', transition: 'background 0.2s' }} />
          ))}
        </div>

        {/* Your Lending / Borrowing — bare list */}
        {activeLoans.length > 0 && (() => {
          const titleStr = 'Select a loan for more details';
          const accentCol = isLending ? '#03ACEA' : '#1D5B94';
          const accentColBg = isLending ? 'rgba(3,172,234,0.10)' : 'rgba(29,91,148,0.10)';
          const sortedLoans = [...activeLoans].sort((a, b) => {
            if (rankingFilter === 'status') {
              const now = todayInTZ();
              const aOv = a.next_payment_date && toLocalDate(a.next_payment_date) < now;
              const bOv = b.next_payment_date && toLocalDate(b.next_payment_date) < now;
              if (aOv && !bOv) return -1;
              if (!aOv && bOv) return 1;
              const dA = a.next_payment_date ? toLocalDate(a.next_payment_date) : new Date('2099-01-01');
              const dB = b.next_payment_date ? toLocalDate(b.next_payment_date) : new Date('2099-01-01');
              return dA - dB;
            }
            if (rankingFilter === 'highest_interest') return (b.interest_rate || 0) - (a.interest_rate || 0);
            if (rankingFilter === 'lowest_interest') return (a.interest_rate || 0) - (b.interest_rate || 0);
            if (rankingFilter === 'highest_payment') return (b.payment_amount || 0) - (a.payment_amount || 0);
            if (rankingFilter === 'lowest_payment') return (a.payment_amount || 0) - (b.payment_amount || 0);
            if (rankingFilter === 'soonest_deadline') { const dA = a.next_payment_date ? toLocalDate(a.next_payment_date) : new Date('2099-01-01'); const dB = b.next_payment_date ? toLocalDate(b.next_payment_date) : new Date('2099-01-01'); return dA - dB; }
            if (rankingFilter === 'largest_amount') return (b.total_amount || b.amount || 0) - (a.total_amount || a.amount || 0);
            if (rankingFilter === 'smallest_amount') return (a.total_amount || a.amount || 0) - (b.total_amount || b.amount || 0);
            if (rankingFilter === 'most_repaid') { const pA = (a.total_amount||a.amount||0)>0?(a.amount_paid||0)/(a.total_amount||a.amount||1):0; const pB = (b.total_amount||b.amount||0)>0?(b.amount_paid||0)/(b.total_amount||b.amount||1):0; return pB-pA; }
            if (rankingFilter === 'least_repaid') { const pA = (a.total_amount||a.amount||0)>0?(a.amount_paid||0)/(a.total_amount||a.amount||1):0; const pB = (b.total_amount||b.amount||0)>0?(b.amount_paid||0)/(b.total_amount||b.amount||1):0; return pA-pB; }
            if (rankingFilter === 'most_recent') return new Date(b.created_at) - new Date(a.created_at);
            return 0;
          });
          return (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{titleStr}</span>
                <Select value={rankingFilter} onValueChange={setRankingFilter}>
                  <SelectTrigger className="w-auto h-7 px-2 border-0 text-xs font-medium rounded-lg" style={{ background: accentColBg, color: accentCol, maxWidth: 130 }}><SelectValue /></SelectTrigger>
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
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sortedLoans.slice(0, 5).map((loan, idx) => {
                  const otherUserId = isLending ? loan.borrower_id : loan.lender_id;
                  const op = publicProfiles.find(p => p.user_id === otherUserId);
                  const name = op?.full_name?.split(' ')[0] || op?.username || 'User';
                  const totalAmt = loan.total_amount || loan.amount || 0;
                  const paidAmt = loan.amount_paid || 0;
                  const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                  const isOverdue = loan.next_payment_date && toLocalDate(loan.next_payment_date) < todayInTZ();
                  const overdueAmt = isOverdue ? (loan.payment_amount || 0) : 0;
                  let badgeLabel = '', badgeColor = accentCol, badgeBg = accentColBg;
                  if (rankingFilter === 'status') { badgeLabel = isOverdue ? `${formatMoney(overdueAmt)} overdue` : 'On track'; badgeColor = isOverdue ? '#E8726E' : accentCol; badgeBg = isOverdue ? 'rgba(232,114,110,0.08)' : accentColBg; }
                  else if (rankingFilter === 'highest_interest' || rankingFilter === 'lowest_interest') { badgeLabel = `${loan.interest_rate || 0}% interest`; }
                  else if (rankingFilter === 'highest_payment' || rankingFilter === 'lowest_payment') { badgeLabel = `${formatMoney(loan.payment_amount || 0)}/period`; }
                  else if (rankingFilter === 'soonest_deadline') { const d = loan.next_payment_date ? daysUntilDate(loan.next_payment_date) : null; badgeLabel = d === null ? '—' : d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'today' : `${d}d`; if (d !== null && d < 0) { badgeColor = '#E8726E'; badgeBg = 'rgba(232,114,110,0.08)'; } }
                  else if (rankingFilter === 'largest_amount' || rankingFilter === 'smallest_amount') { badgeLabel = `${formatMoney(totalAmt)} total`; }
                  else if (rankingFilter === 'most_repaid' || rankingFilter === 'least_repaid') { badgeLabel = `${pct}% repaid`; }
                  else if (rankingFilter === 'most_recent') { badgeLabel = loan.created_at ? formatTZ(loan.created_at, 'MMM d') : '—'; }
                  return (
                    <div key={loan.id} onClick={() => navigate(createPageUrl('LoanDetail') + '?id=' + loan.id)} style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      {/* Avatar of other party + action badge */}
                      <div style={{ position: 'relative', flexShrink: 0, width: 38, height: 38 }}>
                        <UserAvatar name={op?.full_name || op?.username || 'User'} src={op?.profile_picture_url || op?.avatar_url} size={38} />
                        <div style={{ position: 'absolute', right: -2, bottom: -2, width: 18, height: 18, borderRadius: '50%', background: isLending ? '#1A5FBF' : '#3AADD4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FCFCFC', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                          {isLending
                            ? <ArrowUpRight size={10} color="#fff" strokeWidth={2.6} />
                            : <ArrowDownLeft size={10} color="#fff" strokeWidth={2.6} />}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 5, padding: '2px 6px', lineHeight: 1.2 }}>{badgeLabel}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isLending ? `Borrowed ${formatMoney(totalAmt)} from you${loan.purpose ? ` for ${loan.purpose}` : ''}` : `Lent you ${formatMoney(totalAmt)}${loan.purpose ? ` for ${loan.purpose}` : ''}`}
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: '#C7C6C4', flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </>
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

  const today = todayInTZ();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const monthlyReceived = allPayments
    .filter(p => p.status === 'confirmed' || p.status === 'completed')
    .filter(p => { const loan = allLoans.find(l => l.id === p.loan_id); return loan && loan.lender_id === user?.id; })
    .filter(p => { const d = p.payment_date ? toLocalDate(p.payment_date) : toLocalDate(p.created_at); return d >= monthStart && d <= monthEnd; })
    .reduce((s, p) => s + (p.amount || 0), 0);
  const monthlyPaidOut = allPayments
    .filter(p => p.status === 'confirmed' || p.status === 'completed')
    .filter(p => { const loan = allLoans.find(l => l.id === p.loan_id); return loan && loan.borrower_id === user?.id; })
    .filter(p => { const d = p.payment_date ? toLocalDate(p.payment_date) : toLocalDate(p.created_at); return d >= monthStart && d <= monthEnd; })
    .reduce((s, p) => s + (p.amount || 0), 0);
  const monthlyExpectedReceive = activeLendingLoans.reduce((s, l) => s + (l.payment_amount || 0), 0);
  const monthlyExpectedPay = activeBorrowingLoans.reduce((s, l) => s + (l.payment_amount || 0), 0);
  if (embeddedMode) {
    return (
      <>
        {/* Document Popup Modal */}
        <AnimatePresence>
          {activeDocPopup && docPopupAgreement && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeDocPopup}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 18, maxWidth: activeDocPopup === 'amortization' ? 'min(960px, calc(100vw - 32px))' : 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.16)' }}>
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 18, maxWidth: activeDocPopup === 'amortization' ? 'min(960px, calc(100vw - 32px))' : 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.16)' }}>
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

          {/* Page title — desktop only (mobile top bar handles it) */}
          {defaultTab && (
            <div className="desktop-page-title" style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1918', margin: 0, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
                {defaultTab === 'lending' ? 'Lending' : 'Borrowing'}
              </h1>
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

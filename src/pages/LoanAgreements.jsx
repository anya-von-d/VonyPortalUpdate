import React, { useState, useEffect, useRef } from "react";
import { LoanAgreement, User, PublicProfile, Loan, Payment } from "@/entities/all";
import { FileText, CheckCircle, Download, ChevronDown, ChevronRight, ChevronLeft, X, Calendar, DollarSign, Percent, Clock, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, addWeeks, addDays } from "date-fns";
import { jsPDF } from "jspdf";
import { Link, useSearchParams } from "react-router-dom";
import RecentActivity from './RecentActivity';
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import LoanActivity from "../components/loans/LoanActivity";
import { formatMoney } from "@/components/utils/formatMoney";
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";
import DesktopSidebar from '../components/DesktopSidebar';

const ROLE_OPTIONS = [
  { id: 'all', label: 'All Categories' },
  { id: 'lender', label: 'You are the Lender' },
  { id: 'borrower', label: 'You are the Borrower' },
];

const AMOUNT_MODES = [
  { id: 'all', label: 'All amounts' },
  { id: 'exactly', label: 'Exactly' },
  { id: 'between', label: 'Between' },
  { id: 'greater', label: 'Greater than' },
  { id: 'less', label: 'Less than' },
];

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Status' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const DATE_OPTIONS = [
  { id: 'all', label: 'All Dates' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '3m', label: 'Last 3 Months' },
  { id: '6m', label: 'Last 6 Months' },
  { id: '1y', label: 'Last Year' },
  { id: 'older', label: 'Older' },
];

// Matches the Recent Activity sort dropdown so the Records page feels consistent
const SORT_OPTIONS = [
  { id: 'date_desc', label: 'Date (Newest)' },
  { id: 'date_asc', label: 'Date (Oldest)' },
];

const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';

/* ── Single-select dropdown ────────────────────────────────── */
function SingleSelectDropdown({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = options.find(o => o.id === selected) || options[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.06)', background: selected !== 'all' ? 'rgba(3,172,234,0.08)' : 'white',
          fontSize: 13, fontWeight: 500, color: '#1A1918', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s',
        }}
      >
        {current.label}
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 220,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 6,
        }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                border: 'none', cursor: 'pointer', fontSize: 13, color: '#1A1918',
                background: selected === opt.id ? 'rgba(3,172,234,0.08)' : 'transparent',
                fontWeight: selected === opt.id ? 600 : 400, fontFamily: "'DM Sans', sans-serif",
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (selected !== opt.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (selected !== opt.id) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Amount filter dropdown ─────────────────────────────────── */
function AmountFilterDropdown({ amountMode, setAmountMode, amountVal1, setAmountVal1, amountVal2, setAmountVal2 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isFiltered = amountMode !== 'all';
  const displayLabel = amountMode === 'all' ? 'All Amounts'
    : amountMode === 'exactly' ? (amountVal1 ? `Exactly $${amountVal1}` : 'Exactly')
    : amountMode === 'between' ? (amountVal1 && amountVal2 ? `$${amountVal1} – $${amountVal2}` : 'Between')
    : amountMode === 'greater' ? (amountVal1 ? `> $${amountVal1}` : 'Greater than')
    : amountMode === 'less' ? (amountVal1 ? `< $${amountVal1}` : 'Less than')
    : 'All Amounts';

  const modeDescriptions = {
    all: '',
    exactly: 'Search for an exact loan amount.',
    between: 'Search for loans between two amounts.',
    greater: 'Search for loans above a certain amount.',
    less: 'Search for loans below a certain amount.',
  };

  const inputStyle = {
    width: 80, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
    fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.06)', background: isFiltered ? 'rgba(3,172,234,0.08)' : 'white',
        fontSize: 13, fontWeight: 500, color: '#1A1918', cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s',
      }}>
        {displayLabel}
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 360,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, display: 'flex', overflow: 'hidden',
        }}>
          {/* Left: mode list */}
          <div style={{ borderRight: '1px solid rgba(0,0,0,0.06)', padding: '8px 0', minWidth: 140 }}>
            {AMOUNT_MODES.map(mode => (
              <button key={mode.id} onClick={() => { setAmountMode(mode.id); if (mode.id === 'all') { setAmountVal1(''); setAmountVal2(''); } }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif",
                background: amountMode === mode.id ? 'rgba(0,0,0,0.03)' : 'transparent',
                fontWeight: amountMode === mode.id ? 600 : 400, transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                onMouseLeave={e => { if (amountMode !== mode.id) e.currentTarget.style.background = 'transparent'; }}
              >
                {mode.label}
                {amountMode === mode.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1918" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </button>
            ))}
          </div>
          {/* Right: inputs */}
          <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {amountMode === 'all' ? (
              <p style={{ fontSize: 13, color: '#787776', margin: 0 }}>Showing loans of any amount.</p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#787776', margin: 0 }}>{modeDescriptions[amountMode]}</p>
                {amountMode === 'between' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#787776', fontWeight: 500 }}>$</span>
                    <input type="number" placeholder="0" value={amountVal1} onChange={e => setAmountVal1(e.target.value)} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#82F0B9'} onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'} />
                    <span style={{ fontSize: 13, color: '#787776' }}>›</span>
                    <span style={{ fontSize: 12, color: '#787776', fontWeight: 500 }}>$</span>
                    <input type="number" placeholder="0" value={amountVal2} onChange={e => setAmountVal2(e.target.value)} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#82F0B9'} onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, color: '#787776', fontWeight: 500 }}>$</span>
                    <input type="number" placeholder="0" value={amountVal1} onChange={e => setAmountVal1(e.target.value)} style={{ ...inputStyle, width: 100 }}
                      onFocus={e => e.target.style.borderColor = '#82F0B9'} onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoanAgreements() {
  const [agreements, setAgreements] = useState([]);
  const [user, setUser] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [friendFilter, setFriendFilter] = useState('all');
  const [amountMode, setAmountMode] = useState('all');
  const [amountVal1, setAmountVal1] = useState('');
  const [amountVal2, setAmountVal2] = useState('');
  const [activePopup, setActivePopup] = useState(null);
  const [popupAgreement, setPopupAgreement] = useState(null);
  const [activeInfoTooltip, setActiveInfoTooltip] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [laPage, setLaPage] = useState(0);

  const { logout } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'documents';
  const setTab = (t) => setSearchParams({ tab: t });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [currentUser, allAgreements, profiles, allLoans, allPayments] = await Promise.all([
        User.me(),
        LoanAgreement.list('-created_at'),
        PublicProfile.list(),
        Loan.list(),
        Payment.list()
      ]);

      setUser(currentUser);
      setPublicProfiles(profiles || []);
      setLoans(allLoans || []);
      setPayments(allPayments || []);

      const myAgreements = (allAgreements || []).filter(
        agreement =>
          (agreement.lender_id === currentUser.id || agreement.borrower_id === currentUser.id) &&
          agreement.lender_signed_date &&
          agreement.borrower_signed_date
      );
      setAgreements(myAgreements);

      if (selectedAgreement) {
        const updated = myAgreements.find(a => a.id === selectedAgreement.id);
        if (updated) setSelectedAgreement(updated);
      }
    } catch (error) {
      console.error("Error loading agreements:", error);
    }
    setIsLoading(false);
  };

  const getUserById = (userId) => {
    const profile = publicProfiles.find(p => p.user_id === userId);
    return profile || { username: 'user', full_name: 'Unknown User' };
  };

  const getLoanStatus = (loanId) => {
    const loan = loans.find(l => l.id === loanId);
    return loan?.status || 'unknown';
  };

  const getLoanById = (loanId) => {
    return loans.find(l => l.id === loanId);
  };

  const getStatusBadgeStyle = (status) => {
    switch(status) {
      case 'active':    return { background: 'rgba(22,163,74,0.12)',   color: '#16A34A', border: '1px solid rgba(22,163,74,0.25)' };
      case 'completed': return { background: 'rgba(120,119,118,0.10)', color: '#5C5B5A', border: '1px solid rgba(120,119,118,0.22)' };
      case 'cancelled': return { background: 'rgba(232,114,110,0.12)', color: '#D94F4B', border: '1px solid rgba(232,114,110,0.28)' };
      default:          return { background: 'rgba(120,119,118,0.08)', color: '#787776', border: '1px solid rgba(120,119,118,0.15)' };
    }
  };

  // Generate amortization schedule
  const generateAmortizationSchedule = (agreement) => {
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
        principal = balance;
        balance = 0;
      } else {
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

  // Download Promissory Note PDF
  const downloadPromissoryNote = (agreement) => {
    const doc = new jsPDF();
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);

    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('PROMISSORY NOTE', 105, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Document ID: ${agreement.id}`, 105, 35, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(11);
    doc.text(`Date: ${format(new Date(agreement.created_at), 'MMMM d, yyyy')}`, 20, 50);
    doc.text(`Location: United States`, 20, 58);

    doc.setFillColor(240, 240, 240);
    doc.rect(20, 68, 170, 25, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('PRINCIPAL AMOUNT', 25, 78);
    doc.setFontSize(20);
    doc.text(formatMoney(agreement.amount), 25, 88);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    let yPos = 105;
    // Build paragraph matching the Create Loan format
    const pdfFrequency = agreement.payment_frequency || 'monthly';
    const pdfRepaymentPeriod = parseInt(agreement.repayment_period) || 0;
    const pdfRepaymentUnit = agreement.repayment_unit || 'months';
    const pdfNumPayments = pdfFrequency === 'weekly'
      ? Math.ceil(pdfRepaymentPeriod * (pdfRepaymentUnit === 'months' ? 4 : 1))
      : pdfRepaymentPeriod;
    const pdfSendFundsDate = agreement.lender_send_funds_date ? new Date(agreement.lender_send_funds_date) : new Date(agreement.created_at);
    const pdfFirstPaymentDate = agreement.first_payment_date
      ? new Date(agreement.first_payment_date)
      : (pdfFrequency === 'weekly' ? addWeeks(pdfSendFundsDate, 1) : addMonths(pdfSendFundsDate, 1));
    let pdfLastPaymentDate = null;
    if (pdfNumPayments > 0) {
      pdfLastPaymentDate = pdfFrequency === 'weekly'
        ? addWeeks(pdfFirstPaymentDate, pdfNumPayments - 1)
        : addMonths(pdfFirstPaymentDate, pdfNumPayments - 1);
    } else if (agreement.due_date) {
      pdfLastPaymentDate = new Date(agreement.due_date);
    }
    const pdfDayOfMonth = agreement.loan_day_of_month ? parseInt(agreement.loan_day_of_month) : pdfFirstPaymentDate.getDate();
    const pdfDaySuffix = pdfDayOfMonth === 1 ? 'st' : pdfDayOfMonth === 2 ? 'nd' : pdfDayOfMonth === 3 ? 'rd' : 'th';
    const pdfDayOfWeek = agreement.loan_day_of_week || ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][pdfFirstPaymentDate.getDay()];
    const pdfDayOfWeekLabel = pdfDayOfWeek.charAt(0).toUpperCase() + pdfDayOfWeek.slice(1);
    const pdfTimeStr = agreement.loan_time || '12:00';
    const [pdfHourStr, pdfMinStr] = pdfTimeStr.split(':');
    const pdfHour = parseInt(pdfHourStr);
    const pdfHour12 = pdfHour === 0 ? 12 : pdfHour > 12 ? pdfHour - 12 : pdfHour;
    const pdfAmPm = pdfHour >= 12 ? 'PM' : 'AM';
    const pdfFormattedTime = `${pdfHour12}:${pdfMinStr || '00'} ${pdfAmPm}`;
    const pdfTimezone = agreement.loan_timezone || 'EST';
    const pdfDueClause = pdfFrequency === 'weekly' ? `on ${pdfDayOfWeekLabel}` : `on the ${pdfDayOfMonth}${pdfDaySuffix}`;

    const promiseText = `The lender agrees to lend ${borrowerInfo.full_name} ${formatMoney(agreement.amount)} before ${format(pdfSendFundsDate, 'MMM d, yyyy')} at an interest rate of ${agreement.interest_rate}%. The loan will be repaid over ${pdfRepaymentPeriod} ${pdfRepaymentUnit} in ${pdfFrequency} payments of ${formatMoney(agreement.payment_amount)}. Payments will be due ${pdfDueClause} at ${pdfFormattedTime} ${pdfTimezone}, with the first of the ${pdfNumPayments} payments due on ${format(pdfFirstPaymentDate, 'MMM d, yyyy')} and the last payment due on ${pdfLastPaymentDate ? format(pdfLastPaymentDate, 'MMM d, yyyy') : '—'}.${agreement.purpose ? ` This loan is for ${agreement.purpose}.` : ''}`;
    const promiseLines = doc.splitTextToSize(promiseText, 170);
    doc.text(promiseLines, 20, yPos);
    yPos += promiseLines.length * 6 + 10;

    doc.setFont(undefined, 'bold');
    doc.text('TERMS OF REPAYMENT:', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');

    const terms = [
      `Total Amount Due: ${formatMoney(agreement.total_amount)}`,
      `Interest Rate: ${agreement.interest_rate}% per annum`,
      `Payment Amount: ${formatMoney(agreement.payment_amount)} ${agreement.payment_frequency}`,
      `Repayment Period: ${agreement.repayment_period} ${agreement.repayment_unit || 'months'}`,
      `Due Date: ${agreement.due_date ? format(new Date(agreement.due_date), 'MMMM d, yyyy') : 'As per payment schedule'}`,
    ];

    terms.forEach(term => {
      doc.text(`• ${term}`, 25, yPos);
      yPos += 7;
    });

    if (agreement.purpose) {
      yPos += 5;
      doc.text(`Purpose: ${agreement.purpose}`, 20, yPos);
      yPos += 10;
    }

    yPos += 5;
    doc.setFont(undefined, 'bold');
    doc.text('DEFAULT:', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    const defaultText = 'In the event of default in payment of any installment when due, the entire unpaid balance shall, at the option of the Lender, become immediately due and payable.';
    const defaultLines = doc.splitTextToSize(defaultText, 170);
    doc.text(defaultLines, 20, yPos);
    yPos += defaultLines.length * 6 + 15;

    doc.setFont(undefined, 'bold');
    doc.text('SIGNATURES:', 20, yPos);
    yPos += 12;

    doc.setFont(undefined, 'normal');
    doc.text('Borrower:', 20, yPos);
    doc.setFont(undefined, 'italic');
    doc.setFontSize(16);
    doc.text(agreement.borrower_name || borrowerInfo.full_name, 20, yPos + 10);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Signed: ${format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy h:mm a')}`, 20, yPos + 18);

    doc.setFontSize(11);
    doc.text('Lender:', 120, yPos);
    doc.setFont(undefined, 'italic');
    doc.setFontSize(16);
    doc.text(agreement.lender_name || lenderInfo.full_name, 120, yPos + 10);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Signed: ${format(new Date(agreement.lender_signed_date), 'MMM d, yyyy h:mm a')}`, 120, yPos + 18);

    if (agreement.contract_modified && agreement.modification_history) {
      const modifications = JSON.parse(agreement.modification_history || '[]');
      modifications.forEach((mod, index) => {
        doc.addPage();
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(`AMENDMENT ${index + 1}`, 105, 25, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Date of Amendment: ${mod.date ? format(new Date(mod.date), 'MMMM d, yyyy') : 'N/A'}`, 20, 45);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('PREVIOUS TERMS:', 20, 60);
        doc.setFont(undefined, 'normal');
        let modYPos = 70;
        if (mod.previousTerms) {
          Object.entries(mod.previousTerms).forEach(([key, value]) => {
            doc.text(`${key}: ${value}`, 25, modYPos);
            modYPos += 7;
          });
        }
        modYPos += 10;
        doc.setFont(undefined, 'bold');
        doc.text('REASON FOR AMENDMENT:', 20, modYPos);
        modYPos += 8;
        doc.setFont(undefined, 'normal');
        const reasonLines = doc.splitTextToSize(mod.reason || 'No reason provided', 170);
        doc.text(reasonLines, 20, modYPos);
      });
    }

    doc.save(`promissory-note-${agreement.id}.pdf`);
  };

  // Download Amortization Schedule PDF
  const downloadAmortizationSchedule = (agreement) => {
    const doc = new jsPDF('landscape');
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);
    const schedule = generateAmortizationSchedule(agreement);

    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('AMORTIZATION SCHEDULE', 148.5, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Loan Agreement: ${agreement.id}`, 20, 28);
    doc.text(`Lender: ${lenderInfo.full_name} (@${lenderInfo.username})`, 20, 35);
    doc.text(`Borrower: ${borrowerInfo.full_name} (@${borrowerInfo.username})`, 20, 42);

    doc.setFillColor(240, 240, 240);
    doc.rect(20, 48, 257, 20, 'F');
    doc.setFontSize(10);
    doc.text(`Principal: ${formatMoney(agreement.amount)}`, 25, 58);
    doc.text(`Interest Rate: ${agreement.interest_rate}%`, 95, 58);
    doc.text(`Total Amount: ${formatMoney(agreement.total_amount)}`, 155, 58);
    doc.text(`Payment: ${formatMoney(agreement.payment_amount)} ${agreement.payment_frequency}`, 215, 58);

    let yPos = 78;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Payment', 22, yPos);
    doc.text('Payment Date', 42, yPos);
    doc.text('Starting Bal.', 80, yPos);
    doc.text('Principal Pmt', 110, yPos);
    doc.text('Interest Pmt', 142, yPos);
    doc.text('Principal TD', 172, yPos);
    doc.text('Interest TD', 202, yPos);
    doc.text('Ending Bal.', 232, yPos);

    doc.line(20, yPos + 2, 277, yPos + 2);
    yPos += 7;

    doc.setFont(undefined, 'normal');
    schedule.forEach((row, index) => {
      if (yPos > 190) {
        doc.addPage('landscape');
        yPos = 20;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text('Payment', 22, yPos);
        doc.text('Payment Date', 42, yPos);
        doc.text('Starting Bal.', 80, yPos);
        doc.text('Principal Pmt', 110, yPos);
        doc.text('Interest Pmt', 142, yPos);
        doc.text('Principal TD', 172, yPos);
        doc.text('Interest TD', 202, yPos);
        doc.text('Ending Bal.', 232, yPos);
        doc.line(20, yPos + 2, 277, yPos + 2);
        yPos += 7;
        doc.setFont(undefined, 'normal');
      }

      doc.text(String(row.number), 22, yPos);
      doc.text(format(row.date, 'MMM d, yyyy'), 42, yPos);
      doc.text(formatMoney(row.startingBalance), 80, yPos);
      doc.text(formatMoney(row.principal), 110, yPos);
      doc.text(formatMoney(row.interest), 142, yPos);
      doc.text(formatMoney(row.principalToDate), 172, yPos);
      doc.text(formatMoney(row.interestToDate), 202, yPos);
      doc.text(formatMoney(row.endingBalance), 232, yPos);
      yPos += 5;
    });

    yPos += 5;
    doc.line(20, yPos, 277, yPos);
    yPos += 7;
    doc.setFont(undefined, 'bold');
    const totalPrincipal = schedule.reduce((sum, r) => sum + r.principal, 0);
    const totalInterest = schedule.reduce((sum, r) => sum + r.interest, 0);
    doc.text('TOTAL', 22, yPos);
    doc.text(formatMoney(totalPrincipal), 110, yPos);
    doc.text(formatMoney(totalInterest), 142, yPos);

    doc.save(`amortization-schedule-${agreement.id}.pdf`);
  };

  const openPopup = (type, agreement) => {
    setActivePopup(type);
    setPopupAgreement(agreement);
  };

  const closePopup = () => {
    setActivePopup(null);
    setPopupAgreement(null);
  };

  const hasAnyFilter = roleFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all' || friendFilter !== 'all' || amountMode !== 'all' || searchQuery.trim() !== '';
  const clearFilters = () => { setRoleFilter('all'); setStatusFilter('all'); setDateFilter('all'); setFriendFilter('all'); setAmountMode('all'); setAmountVal1(''); setAmountVal2(''); setSearchQuery(''); };

  /* ── Loading state ──────────────────────────────────────────── */
  if (isLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const lendingAgreements = agreements.filter(a => a.lender_id === user?.id);
  const borrowingAgreements = agreements.filter(a => a.borrower_id === user?.id);

  // Apply filters
  let filteredAgreements = agreements;
  if (roleFilter === 'lender') filteredAgreements = lendingAgreements;
  else if (roleFilter === 'borrower') filteredAgreements = borrowingAgreements;

  if (statusFilter !== 'all') {
    filteredAgreements = filteredAgreements.filter(agreement => {
      const loanStatus = getLoanStatus(agreement.loan_id);
      return loanStatus === statusFilter;
    });
  }

  if (dateFilter !== 'all') {
    const now = new Date();
    filteredAgreements = filteredAgreements.filter(agreement => {
      const d = new Date(agreement.created_at);
      const diffMs = now - d;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (dateFilter === '7d') return diffDays <= 7;
      if (dateFilter === '30d') return diffDays <= 30;
      if (dateFilter === '3m') return diffDays <= 91;
      if (dateFilter === '6m') return diffDays <= 182;
      if (dateFilter === '1y') return diffDays <= 365;
      if (dateFilter === 'older') return diffDays > 365;
      return true;
    });
  }

  if (friendFilter !== 'all') {
    filteredAgreements = filteredAgreements.filter(agreement => {
      const isLender = agreement.lender_id === user?.id;
      const otherPartyId = isLender ? agreement.borrower_id : agreement.lender_id;
      return otherPartyId === friendFilter;
    });
  }

  if (amountMode !== 'all') {
    filteredAgreements = filteredAgreements.filter(agreement => {
      const amt = agreement.total_amount || 0;
      const v1 = parseFloat(amountVal1) || 0;
      const v2 = parseFloat(amountVal2) || 0;
      if (amountMode === 'exactly') return amountVal1 && Math.abs(amt - v1) < 0.01;
      if (amountMode === 'between') return amountVal1 && amountVal2 && amt >= Math.min(v1, v2) && amt <= Math.max(v1, v2);
      if (amountMode === 'greater') return amountVal1 && amt > v1;
      if (amountMode === 'less') return amountVal1 && amt < v1;
      return true;
    });
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filteredAgreements = filteredAgreements.filter(agreement => {
      const isLender = agreement.lender_id === user?.id;
      const otherPartyId = isLender ? agreement.borrower_id : agreement.lender_id;
      const otherParty = getUserById(otherPartyId);
      const friendName = (otherParty?.full_name || otherParty?.username || '').toLowerCase();
      const categoryLabel = isLender ? 'borrowed from you' : 'lent to you';
      const amount = `$${(agreement.total_amount || 0).toLocaleString()}`;
      const loanStatus = getLoanStatus(agreement.loan_id);
      return friendName.includes(q) || categoryLabel.includes(q) || amount.includes(q) || loanStatus.includes(q);
    });
  }

  // Sort (matches Recent Activity ordering)
  filteredAgreements = [...filteredAgreements].sort((a, b) => {
    const da = new Date(a.created_at || 0).getTime();
    const db = new Date(b.created_at || 0).getTime();
    return sortBy === 'date_asc' ? da - db : db - da;
  });

  // Build friend options from all agreements
  const friendOptions = [{ id: 'all', label: 'All Friends' }];
  const seenIds = new Set();
  agreements.forEach(agreement => {
    const isLender = agreement.lender_id === user?.id;
    const otherPartyId = isLender ? agreement.borrower_id : agreement.lender_id;
    if (!seenIds.has(otherPartyId)) {
      seenIds.add(otherPartyId);
      const profile = getUserById(otherPartyId);
      friendOptions.push({ id: otherPartyId, label: profile?.full_name || profile?.username || 'Unknown' });
    }
  });

  /* ── Popup Components ───────────────────────────────────────── */
  const PromissoryNotePopup = ({ agreement }) => {
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);

    // Derive scheduling details from available agreement fields
    const paymentFrequency = agreement.payment_frequency || 'monthly';
    const repaymentPeriod = parseInt(agreement.repayment_period) || 0;
    const repaymentUnit = agreement.repayment_unit || 'months';
    const numPayments = paymentFrequency === 'weekly'
      ? Math.ceil(repaymentPeriod * (repaymentUnit === 'months' ? 4 : 1))
      : repaymentPeriod;

    const sendFundsDate = agreement.lender_send_funds_date
      ? new Date(agreement.lender_send_funds_date)
      : new Date(agreement.created_at);
    const firstPaymentDate = agreement.first_payment_date
      ? new Date(agreement.first_payment_date)
      : (paymentFrequency === 'weekly' ? addWeeks(sendFundsDate, 1) : addMonths(sendFundsDate, 1));
    let lastPaymentDate = null;
    if (numPayments > 0) {
      lastPaymentDate = paymentFrequency === 'weekly'
        ? addWeeks(firstPaymentDate, numPayments - 1)
        : addMonths(firstPaymentDate, numPayments - 1);
    } else if (agreement.due_date) {
      lastPaymentDate = new Date(agreement.due_date);
    }

    const dayOfMonth = agreement.loan_day_of_month
      ? parseInt(agreement.loan_day_of_month)
      : firstPaymentDate.getDate();
    const daySuffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th';
    const dayOfWeek = agreement.loan_day_of_week
      || ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][firstPaymentDate.getDay()];
    const dayOfWeekLabel = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

    const timeString = agreement.loan_time || '12:00';
    const [hourStr, minStr] = timeString.split(':');
    const hour = parseInt(hourStr);
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedTime = `${hour12}:${minStr || '00'} ${ampm}`;
    const timezone = agreement.loan_timezone || 'EST';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ background: '#ffffff', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, color: '#787776', marginBottom: 4 }}>Principal Amount</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.amount)}</p>
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#1A1918' }}>
          The lender agrees to lend <strong>{borrowerInfo.full_name}</strong> <strong>{formatMoney(agreement.amount)}</strong> before <strong>{format(sendFundsDate, 'MMM d, yyyy')}</strong> at an interest rate of <strong>{agreement.interest_rate}%</strong>. The loan will be repaid over <strong>{repaymentPeriod} {repaymentUnit}</strong> in <strong>{paymentFrequency}</strong> payments of <strong>{formatMoney(agreement.payment_amount)}</strong>. Payments will be due {paymentFrequency === 'weekly' ? <>on <strong>{dayOfWeekLabel}</strong></> : <>on the <strong>{dayOfMonth}{daySuffix}</strong></>} at <strong>{formattedTime} {timezone}</strong>, with the first of the <strong>{numPayments}</strong> payments due on <strong>{format(firstPaymentDate, 'MMM d, yyyy')}</strong> and the last payment due on <strong>{lastPaymentDate ? format(lastPaymentDate, 'MMM d, yyyy') : '—'}</strong>.{agreement.purpose ? <> This loan is for <strong>{agreement.purpose}</strong>.</> : ''}
        </p>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', marginBottom: 12 }}>Terms of Repayment</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div><span style={{ color: '#787776' }}>Total Amount Due:</span> <span style={{ fontWeight: 500 }}>{formatMoney(agreement.total_amount)}</span></div>
            <div><span style={{ color: '#787776' }}>Interest Rate:</span> <span style={{ fontWeight: 500 }}>{agreement.interest_rate}%</span></div>
            <div><span style={{ color: '#787776' }}>Payment:</span> <span style={{ fontWeight: 500 }}>{formatMoney(agreement.payment_amount)} {agreement.payment_frequency}</span></div>
            <div><span style={{ color: '#787776' }}>Term:</span> <span style={{ fontWeight: 500 }}>{agreement.repayment_period} {agreement.repayment_unit || 'months'}</span></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Borrower</p>
            <p style={{ fontSize: 13, fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif", color: '#1A1918', margin: 0 }}>{agreement.borrower_name || borrowerInfo.full_name}</p>
            <p style={{ fontSize: 11, color: '#787776', marginTop: 4 }}>Signed {format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy')}</p>
          </div>
          <div style={{ background: '#ffffff', borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Lender</p>
            <p style={{ fontSize: 13, fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif", color: '#1A1918', margin: 0 }}>{agreement.lender_name || lenderInfo.full_name}</p>
            <p style={{ fontSize: 11, color: '#787776', marginTop: 4 }}>Signed {format(new Date(agreement.lender_signed_date), 'MMM d, yyyy')}</p>
          </div>
        </div>

        <button
          onClick={() => downloadPromissoryNote(agreement)}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
            background: '#03ACEA', color: 'white', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>
    );
  };

  const AmortizationSchedulePopup = ({ agreement }) => {
    const schedule = generateAmortizationSchedule(agreement);
    const loan = getLoanById(agreement.loan_id);
    const paidPayments = loan?.amount_paid ? Math.floor(loan.amount_paid / agreement.payment_amount) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ background: '#ffffff', borderRadius: 10, border: 'none', padding: '10px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Principal</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', margin: '4px 0 0' }}>{formatMoney(agreement.amount)}</p>
          </div>
          <div style={{ background: '#ffffff', borderRadius: 10, border: 'none', padding: '10px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Interest</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', margin: '4px 0 0' }}>{formatMoney((agreement.total_amount || 0) - (agreement.amount || 0))}</p>
          </div>
          <div style={{ background: 'rgba(3,172,234,0.07)', borderRadius: 12, border: '1px solid rgba(3,172,234,0.18)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '10px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#03ACEA', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Total</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', margin: '4px 0 0' }}>{formatMoney(agreement.total_amount)}</p>
          </div>
        </div>

        <div style={{ maxHeight: 320, overflowX: 'auto', overflowY: 'auto', borderRadius: 12, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', fontSize: 11, minWidth: 700, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Payment</th>
                <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Date</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontSize: 10, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Start Bal.</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontSize: 10, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Principal</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontSize: 10, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Interest</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontSize: 10, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Prin. TD</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontSize: 10, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Int. TD</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontSize: 10, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>End Bal.</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, index) => (
                <tr key={row.number} style={{ background: index < paidPayments ? 'rgba(3,172,234,0.05)' : index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                  <td style={{ padding: '7px 10px', color: '#787776', borderBottom: '1px solid rgba(0,0,0,0.035)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {index < paidPayments && <CheckCircle size={11} style={{ color: '#03ACEA', flexShrink: 0 }} />}
                      <span style={{ fontWeight: index < paidPayments ? 600 : 400 }}>{row.number}</span>
                    </div>
                  </td>
                  <td style={{ padding: '7px 10px', color: '#1A1918', borderBottom: '1px solid rgba(0,0,0,0.035)' }}>{format(row.date, 'MMM d, yyyy')}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#9B9A98', borderBottom: '1px solid rgba(0,0,0,0.035)' }}>{formatMoney(row.startingBalance)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#1A1918', borderBottom: '1px solid rgba(0,0,0,0.035)' }}>{formatMoney(row.principal)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#787776', borderBottom: '1px solid rgba(0,0,0,0.035)' }}>{formatMoney(row.interest)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#9B9A98', borderBottom: '1px solid rgba(0,0,0,0.035)' }}>{formatMoney(row.principalToDate)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#9B9A98', borderBottom: '1px solid rgba(0,0,0,0.035)' }}>{formatMoney(row.interestToDate)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: index < paidPayments ? '#03ACEA' : '#1A1918', borderBottom: '1px solid rgba(0,0,0,0.035)' }}>{formatMoney(row.endingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => downloadAmortizationSchedule(agreement)}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
            background: '#03ACEA', color: 'white', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>
    );
  };

  const LoanSummaryPopup = ({ agreement }) => {
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);
    const loanStatus = getLoanStatus(agreement.loan_id);
    const loan = getLoanById(agreement.loan_id);
    const badgeStyle = getStatusBadgeStyle(loanStatus);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Loan Amount</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.amount)}</p>
          </div>
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Total Due</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.total_amount)}</p>
          </div>
        </div>

        {loan && (
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#787776' }}>Payment Progress</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
                {formatMoney(loan.amount_paid || 0)} / {formatMoney(agreement.total_amount)}
              </span>
            </div>
            <div style={{ width: '100%', background: 'white', borderRadius: 3, height: 6 }}>
              <div
                style={{
                  background: '#03ACEA', height: 6, borderRadius: 3, transition: 'width 0.3s',
                  width: `${Math.min(100, ((loan.amount_paid || 0) / agreement.total_amount) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Percent size={16} style={{ color: '#787776' }} />
              <div>
                <p style={{ color: '#787776', margin: 0 }}>Interest Rate</p>
                <p style={{ fontWeight: 600, color: '#1A1918', margin: 0 }}>{agreement.interest_rate}%</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={16} style={{ color: '#787776' }} />
              <div>
                <p style={{ color: '#787776', margin: 0 }}>Payment Amount</p>
                <p style={{ fontWeight: 600, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.payment_amount)}</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: '#787776' }} />
              <div>
                <p style={{ color: '#787776', margin: 0 }}>Payment Frequency</p>
                <p style={{ fontWeight: 600, color: '#1A1918', margin: 0, textTransform: 'capitalize' }}>{agreement.payment_frequency}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} style={{ color: '#787776' }} />
              <div>
                <p style={{ color: '#787776', margin: 0 }}>Due Date</p>
                <p style={{ fontWeight: 600, color: '#1A1918', margin: 0 }}>{agreement.due_date ? format(new Date(agreement.due_date), 'MMM d, yyyy') : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', marginBottom: 12 }}>Parties</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <UserAvatar name={lenderInfo.full_name} src={lenderInfo.profile_picture_url} size={40} />
              <div>
                <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Lender</p>
                <p style={{ fontWeight: 500, color: '#1A1918', margin: 0 }}>{lenderInfo.full_name}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <UserAvatar name={borrowerInfo.full_name} src={borrowerInfo.profile_picture_url} size={40} />
              <div>
                <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Borrower</p>
                <p style={{ fontWeight: 500, color: '#1A1918', margin: 0 }}>{borrowerInfo.full_name}</p>
              </div>
            </div>
          </div>
        </div>

        {agreement.purpose && (
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Purpose</p>
            <p style={{ color: '#1A1918', margin: 0 }}>{agreement.purpose}</p>
          </div>
        )}

        {/* Links to other documents */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>Documents</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setActivePopup('promissory')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(3,172,234,0.3)',
                background: 'rgba(3,172,234,0.06)', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <FileText size={14} style={{ color: '#03ACEA' }} />
              Promissory Note
            </button>
            <button
              onClick={() => setActivePopup('amortization')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(37,99,235,0.3)',
                background: 'rgba(37,99,235,0.06)', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <FileText size={14} style={{ color: '#2563EB' }} />
              Amortization Schedule
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Pending confirmations for right panel ───────────────── */
  const pendingToConfirm = payments.filter(p => {
    const loan = loans.find(l => l.id === p.loan_id);
    return loan && loan.lender_id === user?.id && p.status === 'pending_confirmation';
  });

  /* ── RightSection component ──────────────────────────────── */
  const RightSection = ({ title, children }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif", paddingBottom: 5, marginBottom: 2 }}>{title}</div>
      {children}
    </div>
  );

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */

  const LA_PAGE_SIZE = 20;
  const laTotalPages = Math.max(1, Math.ceil(filteredAgreements.length / LA_PAGE_SIZE));
  const laSafePage = Math.min(laPage, laTotalPages - 1);
  const laPageItems = filteredAgreements.slice(laSafePage * LA_PAGE_SIZE, (laSafePage + 1) * LA_PAGE_SIZE);

  const PageCard = ({ title, headerRight, children, style }) => (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px', ...style }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 5, marginBottom: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{title}</div>
          {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
        </div>
        <div style={{ overflow: 'visible' }}>{children}</div>
      </div>
    </div>
  );

  return (
    <>
      <MeshMobileNav user={user} activePage="Records" />
      {/* Popup Modal */}
      <AnimatePresence>
        {activePopup && popupAgreement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={closePopup}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#ffffff', borderRadius: 18, maxWidth: activePopup === 'amortization' ? 'min(960px, calc(100vw - 32px))' : 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.16)' }}
            >
              <div style={{ position: 'sticky', top: 0, background: 'transparent', padding: '6px 14px 5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '18px 18px 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} style={{ color: '#9B9A98' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                    {activePopup === 'promissory' && 'Promissory Note'}
                    {activePopup === 'amortization' && 'Amortization Schedule'}
                    {activePopup === 'summary' && 'Loan Summary'}
                  </span>
                </div>
                <button onClick={closePopup} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#787776' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 10, padding: 20 }}>
                {activePopup === 'promissory' && <PromissoryNotePopup agreement={popupAgreement} />}
                {activePopup === 'amortization' && <AmortizationSchedulePopup agreement={popupAgreement} />}
                {activePopup === 'summary' && <LoanSummaryPopup agreement={popupAgreement} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>

        {/* Col 1: left nav */}
        <DesktopSidebar />

        {/* Col 2: center content */}
        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 56px 80px' }}>

          {/* Desktop page title */}
          <div className="desktop-page-title" style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, color: '#1A1918' }}>
              Records
            </div>
          </div>

          {/* Mobile-only page title (desktop shows it in top bar) */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Records</div>
          </div>

          {/* Tab nav */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { key: 'documents', label: 'Loan Documents' },
                { key: 'activity', label: 'Transactions & Activity' },
              ].map(({ key, label }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    style={{
                      position: 'relative',
                      flex: 1,
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '10px 0 12px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14, fontWeight: active ? 700 : 500,
                      color: active ? '#1A1918' : '#9B9A98',
                      letterSpacing: '-0.02em',
                      transition: 'color 0.15s',
                    }}
                  >
                    {label}
                    {active && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: 2, borderRadius: 2, background: '#1A1918',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ height: 1, background: '#E8E7E5' }} />
          </div>

          {activeTab === 'documents' ? (
          <>
          {/* Filters */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'transparent', borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)', height: 36 }}>
                <Search size={14} style={{ color: '#787776', flexShrink: 0 }} />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#1A1918', background: 'transparent' }} />
              </div>
            </div>
            <div className="filter-row-scroll" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, position: 'relative', zIndex: 20 }}>
              {/* Sort-by sits to the LEFT of the date filter, mirroring Recent Activity */}
              <SingleSelectDropdown options={SORT_OPTIONS} selected={sortBy} onChange={setSortBy} />
              <SingleSelectDropdown options={DATE_OPTIONS} selected={dateFilter} onChange={setDateFilter} />
              {friendOptions.length > 1 && (
                <SingleSelectDropdown options={friendOptions} selected={friendFilter} onChange={setFriendFilter} />
              )}
              <SingleSelectDropdown options={ROLE_OPTIONS} selected={roleFilter} onChange={setRoleFilter} />
              <SingleSelectDropdown options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
              <AmountFilterDropdown amountMode={amountMode} setAmountMode={setAmountMode} amountVal1={amountVal1} setAmountVal1={setAmountVal1} amountVal2={amountVal2} setAmountVal2={setAmountVal2} />
              <button onClick={clearFilters} style={{ padding: '6px 10px', borderRadius: 8, border: hasAnyFilter ? '1px solid rgba(232,114,110,0.3)' : '1px solid rgba(0,0,0,0.08)', background: hasAnyFilter ? 'rgba(232,114,110,0.06)' : 'transparent', fontSize: 12, fontWeight: 500, color: hasAnyFilter ? '#E8726E' : '#787776', cursor: hasAnyFilter ? 'pointer' : 'default', opacity: hasAnyFilter ? 1 : 0.5, fontFamily: "'DM Sans', sans-serif" }}>Clear Filters</button>
            </div>
          </div>

          {/* ── Agreements List ──────────────────────────────────── */}
          <div style={{ background: '#ffffff', borderRadius: 10, border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, padding: '10px 16px' }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#787776', marginRight: 4 }}>Page {laSafePage + 1} of {laTotalPages}</span>
              <button onClick={() => setLaPage(Math.max(0, laSafePage - 1))} disabled={laSafePage === 0} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(0,0,0,0.09)', background: 'white', cursor: laSafePage === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: laSafePage === 0 ? 0.3 : 1, flexShrink: 0 }}>
                <ChevronLeft size={13} style={{ color: '#787776' }} />
              </button>
              <button onClick={() => setLaPage(Math.min(laTotalPages - 1, laSafePage + 1))} disabled={laSafePage >= laTotalPages - 1} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(0,0,0,0.09)', background: 'white', cursor: laSafePage >= laTotalPages - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: laSafePage >= laTotalPages - 1 ? 0.3 : 1, flexShrink: 0 }}>
                <ChevronRight size={13} style={{ color: '#787776' }} />
              </button>
            </div>
            <div style={{ padding: '0 16px' }}>
              {filteredAgreements.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                  <p style={{ fontSize: 13, color: '#787776', margin: 0, textAlign: 'center' }}>
                    {agreements.length === 0
                      ? 'Once you create a loan, your signed agreements will live here 📝'
                      : 'No agreements match the current filters'}
                  </p>
                  {hasAnyFilter && <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0' }}>Try adjusting your filters</p>}
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="la-table-header" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '0 0 12px',
                    borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 4,
                  }}>
                    <span style={{ width: 100, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>Date Signed</span>
                    <span style={{ flex: 1.5, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 0 }}>Friend</span>
                    <span style={{ flex: 1.4, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 0 }}>Category</span>
                    <span style={{ flex: 1.2, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 0 }}>Reason</span>
                    <span style={{ width: 100, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', flexShrink: 0 }}>Amount</span>
                    <div style={{ width: 28, flexShrink: 0 }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {laPageItems.map((agreement) => {
                      const isLender = agreement.lender_id === user?.id;
                      const otherPartyId = isLender ? agreement.borrower_id : agreement.lender_id;
                      const otherParty = getUserById(otherPartyId);
                      const loanStatus = getLoanStatus(agreement.loan_id);
                      const badgeStyle = getStatusBadgeStyle(loanStatus);
                      const isExpanded = expandedId === agreement.id;
                      const dateFormatted = agreement.created_at ? format(new Date(agreement.created_at), 'MMM d, yyyy') : '';

                      return (
                        <div key={agreement.id}>
                          <div
                            onClick={() => setExpandedId(isExpanded ? null : agreement.id)}
                            className="la-table-row"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
                              transition: 'background 0.15s', cursor: 'pointer',
                            }}
                          >
                            {/* Date Signed */}
                            <span className="la-col-date" style={{ width: 100, fontSize: 12, fontWeight: 500, color: '#787776', flexShrink: 0 }}>
                              <span className="la-date-text">{dateFormatted}</span>
                              <ChevronDown className="la-date-chevron" size={16} style={{ color: '#9B9A98' }} />
                            </span>
                            {/* Friend */}
                            <div className="la-col-friend" style={{ display: 'flex', flex: 1.5, minWidth: 0, alignItems: 'center' }}>
                              <span className="la-friend-desktop" style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {otherParty.full_name}
                              </span>
                              <span className="la-friend-mobile" style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
                                {isLender
                                  ? `${otherParty.full_name} borrowed ${formatMoney(agreement.total_amount)} from you`
                                  : `You borrowed ${formatMoney(agreement.total_amount)} from ${otherParty.full_name}`}
                              </span>
                            </div>
                            {/* Category */}
                            <div className="la-col-category" style={{ display: 'flex', flex: 1.4, minWidth: 0, alignItems: 'center' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '3px 8px', borderRadius: 7,
                                fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                                ...(isLender
                                  ? { background: 'rgba(3,172,234,0.10)', color: '#03ACEA', border: '1px solid rgba(3,172,234,0.25)' }
                                  : { background: 'rgba(29,91,148,0.10)', color: '#1D5B94', border: '1px solid rgba(29,91,148,0.25)' }
                                ),
                              }}>
                                {isLender ? 'You are the Lender' : 'You are the Borrower'}
                              </span>
                            </div>
                            {/* Reason (replaces the old Status column on desktop);
                                the mobile date chip still lives here so it lines up
                                with the other mobile-only badges on the right. */}
                            <div className="la-col-status" style={{ display: 'flex', flex: 1.2, minWidth: 0, alignItems: 'center', gap: 6 }}>
                              <span className="la-reason-desktop" style={{
                                fontSize: 12, color: '#1A1918', overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {agreement.purpose || <span style={{ color: '#C7C6C4' }}>—</span>}
                              </span>
                              <span className="la-mobile-date" style={{ fontSize: 11, color: '#787776' }}>{dateFormatted}</span>
                            </div>
                            {/* Amount */}
                            <span className="la-col-amount" style={{ width: 100, fontSize: 13, fontWeight: 600, color: '#1A1918', textAlign: 'right', flexShrink: 0 }}>
                              {formatMoney(agreement.total_amount)}
                            </span>

                            {/* Expand arrow */}
                            <div className="la-col-arrow" style={{
                              width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, transition: 'transform 0.2s',
                              transform: isExpanded ? 'rotate(90deg)' : 'none',
                            }}>
                              <ChevronRight size={16} style={{ color: '#787776' }} />
                            </div>
                          </div>

                          {/* Expanded document buttons */}
                          {isExpanded && (
                            <div style={{
                              padding: '12px 0 16px',
                              borderTop: '1px solid rgba(0,0,0,0.05)',
                              display: 'flex', gap: 8, flexWrap: 'wrap',
                            }}>
                              {/* Promissory Note */}
                              <div style={{ position: 'relative' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1A1918', borderRadius: 9, padding: '7px 12px', border: 'none', cursor: 'pointer' }}
                                  onClick={(e) => { e.stopPropagation(); openPopup('promissory', agreement); }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#333'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#1A1918'}
                                >
                                  <p style={{ fontSize: 11, fontWeight: 600, color: 'white', margin: 0 }}>Promissory Note</p>
                                  <span
                                    style={{ width: 15, height: 15, borderRadius: '50%', background: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                    onMouseEnter={(e) => { e.stopPropagation(); setActiveInfoTooltip(`promissory-${agreement.id}`); }}
                                    onMouseLeave={(e) => { e.stopPropagation(); setActiveInfoTooltip(null); }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span style={{ fontSize: 9, fontWeight: 800, color: '#1A1918', lineHeight: 1 }}>i</span>
                                  </span>
                                </div>
                                {activeInfoTooltip === `promissory-${agreement.id}` && (
                                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'white', borderRadius: 9, padding: '8px 11px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)', width: 190, zIndex: 200, border: '1px solid rgba(0,0,0,0.06)' }}>
                                    <p style={{ fontSize: 11, color: '#1A1918', margin: 0, lineHeight: 1.55 }}>A signed legal document where the borrower promises to repay a specific amount under agreed terms.</p>
                                  </div>
                                )}
                              </div>

                              {/* Amortization Schedule */}
                              <div style={{ position: 'relative' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1A1918', borderRadius: 9, padding: '7px 12px', border: 'none', cursor: 'pointer' }}
                                  onClick={(e) => { e.stopPropagation(); openPopup('amortization', agreement); }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#333'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#1A1918'}
                                >
                                  <p style={{ fontSize: 11, fontWeight: 600, color: 'white', margin: 0 }}>Amortization Schedule</p>
                                  <span
                                    style={{ width: 15, height: 15, borderRadius: '50%', background: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                    onMouseEnter={(e) => { e.stopPropagation(); setActiveInfoTooltip(`amortization-${agreement.id}`); }}
                                    onMouseLeave={(e) => { e.stopPropagation(); setActiveInfoTooltip(null); }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span style={{ fontSize: 9, fontWeight: 800, color: '#1A1918', lineHeight: 1 }}>i</span>
                                  </span>
                                </div>
                                {activeInfoTooltip === `amortization-${agreement.id}` && (
                                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'white', borderRadius: 9, padding: '8px 11px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)', width: 190, zIndex: 200, border: '1px solid rgba(0,0,0,0.06)' }}>
                                    <p style={{ fontSize: 11, color: '#1A1918', margin: 0, lineHeight: 1.55 }}>A table showing each scheduled payment broken down into principal and interest over the life of the loan.</p>
                                  </div>
                                )}
                              </div>

                              {/* Loan Summary */}
                              <div
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1A1918', borderRadius: 9, padding: '7px 12px', border: 'none', cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); openPopup('summary', agreement); }}
                                onMouseEnter={e => e.currentTarget.style.background = '#333'}
                                onMouseLeave={e => e.currentTarget.style.background = '#1A1918'}
                              >
                                <p style={{ fontSize: 11, fontWeight: 600, color: 'white', margin: 0 }}>Loan Summary</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop table responsive styles */}
          <style>{`
            @media (min-width: 900px) {
              .la-table-header { display: flex !important; }
              .la-mobile-content { display: none !important; }
              .la-mobile-status { display: none !important; }
              .la-desktop-date { display: block !important; }
              .la-desktop-friend { display: flex !important; }
              .la-desktop-category { display: flex !important; }
              .la-desktop-status { display: flex !important; }
              .la-desktop-amount { display: block !important; }
            }
          `}</style>
          </>) : (
            <RecentActivity embeddedMode />
          )}

        </div>


      </div>
    </>
  );
}

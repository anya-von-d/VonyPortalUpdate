import React, { useState, useEffect, useRef } from "react";
import { LoanAgreement, User, PublicProfile, Loan, Payment } from "@/entities/all";
import { FileText, CheckCircle, Download, ChevronDown, ChevronRight, X, Calendar, DollarSign, Percent, Clock, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, addWeeks, addDays } from "date-fns";
import { jsPDF } from "jspdf";
import LoanActivity from "../components/loans/LoanActivity";
import { formatMoney } from "@/components/utils/formatMoney";
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

const ROLE_OPTIONS = [
  { id: 'all', label: 'All Roles' },
  { id: 'lender', label: 'You are the Lender' },
  { id: 'borrower', label: 'You are the Borrower' },
];

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Status' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

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
          border: '1px solid rgba(0,0,0,0.08)', background: selected !== 'all' ? 'rgba(103,138,251,0.08)' : 'white',
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
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 6,
        }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                border: 'none', cursor: 'pointer', fontSize: 13, color: '#1A1918',
                background: selected === opt.id ? 'rgba(103,138,251,0.08)' : 'transparent',
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
  const [activePopup, setActivePopup] = useState(null);
  const [popupAgreement, setPopupAgreement] = useState(null);
  const [activeInfoTooltip, setActiveInfoTooltip] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      case 'active': return { background: 'rgba(103,138,251,0.1)', color: '#678AFB', border: '1px solid rgba(103,138,251,0.2)' };
      case 'completed': return { background: 'rgba(103,138,251,0.1)', color: '#678AFB', border: '1px solid rgba(103,138,251,0.2)' };
      case 'cancelled': return { background: 'rgba(232,114,110,0.08)', color: '#E8726E', border: '1px solid rgba(232,114,110,0.2)' };
      default: return { background: 'rgba(120,119,118,0.08)', color: '#787776', border: '1px solid rgba(120,119,118,0.15)' };
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
    const promiseText = `${lenderInfo.full_name} agrees to lend ${borrowerInfo.full_name} ${formatMoney(agreement.amount)}${agreement.purpose ? ` for ${agreement.purpose}` : ''}, with ${agreement.interest_rate}% interest. ${borrowerInfo.full_name} agrees to pay back ${formatMoney(agreement.total_amount)} in ${agreement.payment_frequency} payments of ${formatMoney(agreement.payment_amount)} over ${agreement.repayment_period} ${agreement.repayment_unit || 'months'}.`;
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

  const hasAnyFilter = roleFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';
  const clearFilters = () => { setRoleFilter('all'); setStatusFilter('all'); setSearchQuery(''); };

  /* ── Loading state ──────────────────────────────────────────── */
  if (isLoading || !user) {
    return (
      <div className="home-with-sidebar" style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240, background: '#6587F9' }}>
        <DashboardSidebar activePage="LoanAgreements" user={user} />
        <div className="content-box-glow" style={{ position: 'relative', margin: '20px 12px 12px 0', borderRadius: 24, minHeight: 'calc(100vh - 32px)', border: '12px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'rgba(0,0,0,0.03) 0px 0.6px 2.3px -0.42px, rgba(0,0,0,0.04) 0px 2.3px 8.7px -0.83px, rgba(0,0,0,0.08) 0px 10px 38px -1.25px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', bottom: 0, overflow: 'hidden', borderRadius: 12, zIndex: 0, pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', top: 0, left: '-10%', width: '120%', height: '100%', zIndex: 0,
              background: '#6587F9'
            }} />
          </div>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: 1080, margin: '0 auto', padding: '0 28px' }}>
            <div style={{ paddingTop: 80, paddingBottom: 20, textAlign: 'center' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '3.2rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#1A1918', margin: 0 }}>Loan Documents</h1>
            </div>
          </div>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px', position: 'relative', zIndex: 2 }}>
            <div className="glass-card" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, border: '2px solid #678AFB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: '#787776' }}>{isLoading ? 'Loading documents...' : 'Please log in to view documents'}</p>
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 11, color: '#787776' }}>Terms of Service</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Privacy Center</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Do not sell or share my personal information</span>
          </div>
        </div>
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

  /* ── Popup Components ───────────────────────────────────────── */
  const PromissoryNotePopup = ({ agreement }) => {
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 16 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1918', margin: 0 }}>PROMISSORY NOTE</h2>
          <p style={{ fontSize: 12, color: '#787776', marginTop: 4 }}>Document ID: {agreement.id}</p>
        </div>

        <div style={{ background: 'rgba(103,138,251,0.1)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 12, color: '#787776', marginBottom: 4 }}>Principal Amount</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.amount)}</p>
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#1A1918' }}>
          <strong>{lenderInfo.full_name}</strong> agrees to lend <strong>{borrowerInfo.full_name}</strong> <strong>{formatMoney(agreement.amount)}</strong>{agreement.purpose ? <> for <strong>{agreement.purpose}</strong></> : ''}, with <strong>{agreement.interest_rate}%</strong> interest. <strong>{borrowerInfo.full_name}</strong> agrees to pay back <strong>{formatMoney(agreement.total_amount)}</strong> in <strong>{agreement.payment_frequency}</strong> payments of <strong>{formatMoney(agreement.payment_amount)}</strong> over <strong>{agreement.repayment_period} {agreement.repayment_unit || 'months'}</strong>.
        </p>

        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', marginBottom: 12 }}>Terms of Repayment</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div><span style={{ color: '#787776' }}>Total Amount Due:</span> <span style={{ fontWeight: 500 }}>{formatMoney(agreement.total_amount)}</span></div>
            <div><span style={{ color: '#787776' }}>Interest Rate:</span> <span style={{ fontWeight: 500 }}>{agreement.interest_rate}%</span></div>
            <div><span style={{ color: '#787776' }}>Payment:</span> <span style={{ fontWeight: 500 }}>{formatMoney(agreement.payment_amount)} {agreement.payment_frequency}</span></div>
            <div><span style={{ color: '#787776' }}>Term:</span> <span style={{ fontWeight: 500 }}>{agreement.repayment_period} {agreement.repayment_unit || 'months'}</span></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Borrower</p>
            <p style={{ fontSize: 18, fontStyle: 'italic', fontFamily: 'Georgia, serif', color: '#1A1918', margin: 0 }}>{agreement.borrower_name || borrowerInfo.full_name}</p>
            <p style={{ fontSize: 11, color: '#787776', marginTop: 4 }}>Signed {format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy')}</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Lender</p>
            <p style={{ fontSize: 18, fontStyle: 'italic', fontFamily: 'Georgia, serif', color: '#1A1918', margin: 0 }}>{agreement.lender_name || lenderInfo.full_name}</p>
            <p style={{ fontSize: 11, color: '#787776', marginTop: 4 }}>Signed {format(new Date(agreement.lender_signed_date), 'MMM d, yyyy')}</p>
          </div>
        </div>

        <button
          onClick={() => downloadPromissoryNote(agreement)}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
            background: '#678AFB', color: 'white', fontSize: 13, fontWeight: 600,
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 16 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1918', margin: 0 }}>AMORTIZATION SCHEDULE</h2>
          <p style={{ fontSize: 12, color: '#787776', marginTop: 4 }}>{schedule.length} payments · {agreement.payment_frequency}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(103,138,251,0.08)', borderRadius: 16, padding: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Principal</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1918', margin: '4px 0 0' }}>{formatMoney(agreement.amount)}</p>
          </div>
          <div style={{ background: 'rgba(167,157,234,0.1)', borderRadius: 16, padding: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Interest</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1918', margin: '4px 0 0' }}>{formatMoney((agreement.total_amount || 0) - (agreement.amount || 0))}</p>
          </div>
          <div style={{ background: 'rgba(103,138,251,0.12)', borderRadius: 16, padding: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Total</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1918', margin: '4px 0 0' }}>{formatMoney(agreement.total_amount)}</p>
          </div>
        </div>

        <div style={{ maxHeight: 300, overflowX: 'auto', overflowY: 'auto', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', fontSize: 11, minWidth: 700, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
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
                <tr key={row.number} style={{ background: index < paidPayments ? 'rgba(103,138,251,0.05)' : 'transparent', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  <td style={{ padding: '6px 8px', color: '#787776' }}>
                    {index < paidPayments && <CheckCircle size={12} style={{ color: '#678AFB', marginRight: 4, verticalAlign: 'middle' }} />}
                    {row.number}
                  </td>
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

        <button
          onClick={() => downloadAmortizationSchedule(agreement)}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
            background: '#678AFB', color: 'white', fontSize: 13, fontWeight: 600,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1918', margin: 0 }}>Loan Summary</h2>
            <p style={{ fontSize: 12, color: '#787776', marginTop: 4 }}>{format(new Date(agreement.created_at), 'MMMM d, yyyy')}</p>
          </div>
          <span style={{ ...badgeStyle, padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{loanStatus}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'rgba(103,138,251,0.08)', borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Loan Amount</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#1A1918', margin: 0 }}>{formatMoney(agreement.amount)}</p>
          </div>
          <div style={{ background: 'rgba(167,157,234,0.1)', borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Total Due</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#678AFB', margin: 0 }}>{formatMoney(agreement.total_amount)}</p>
          </div>
        </div>

        {loan && (
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#787776' }}>Payment Progress</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
                {formatMoney(loan.amount_paid || 0)} / {formatMoney(agreement.total_amount)}
              </span>
            </div>
            <div style={{ width: '100%', background: 'white', borderRadius: 999, height: 8 }}>
              <div
                style={{
                  background: '#678AFB', height: 8, borderRadius: 999, transition: 'width 0.3s',
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
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', marginBottom: 12 }}>Parties</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={lenderInfo.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((lenderInfo.full_name || 'L').charAt(0))}&background=678AFB&color=fff&size=64`}
                alt={lenderInfo.full_name}
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Lender</p>
                <p style={{ fontWeight: 500, color: '#1A1918', margin: 0 }}>{lenderInfo.full_name}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={borrowerInfo.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((borrowerInfo.full_name || 'B').charAt(0))}&background=678AFB&color=fff&size=64`}
                alt={borrowerInfo.full_name}
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Borrower</p>
                <p style={{ fontWeight: 500, color: '#1A1918', margin: 0 }}>{borrowerInfo.full_name}</p>
              </div>
            </div>
          </div>
        </div>

        {agreement.purpose && (
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Purpose</p>
            <p style={{ color: '#1A1918', margin: 0 }}>{agreement.purpose}</p>
          </div>
        )}
      </div>
    );
  };

  const colors = [
    'rgba(103,138,251,0.08)', 'rgba(167,157,234,0.08)', 'rgba(103,138,251,0.06)',
    'rgba(167,157,234,0.06)', 'rgba(103,138,251,0.1)', 'rgba(167,157,234,0.1)',
  ];

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Popup Modal */}
      <AnimatePresence>
        {activePopup && popupAgreement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={closePopup}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 20, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.12)' }}
            >
              <div style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px 20px 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(103,138,251,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={16} style={{ color: '#678AFB' }} />
                  </div>
                  <span style={{ fontWeight: 500, color: '#1A1918' }}>
                    {activePopup === 'promissory' && 'Promissory Note'}
                    {activePopup === 'amortization' && 'Amortization Schedule'}
                    {activePopup === 'summary' && 'Loan Summary'}
                  </span>
                </div>
                <button onClick={closePopup} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#787776' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: 24 }}>
                {activePopup === 'promissory' && <PromissoryNotePopup agreement={popupAgreement} />}
                {activePopup === 'amortization' && <AmortizationSchedulePopup agreement={popupAgreement} />}
                {activePopup === 'summary' && <LoanSummaryPopup agreement={popupAgreement} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="home-with-sidebar" style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240, background: '#6587F9' }}>
        <DashboardSidebar activePage="LoanAgreements" user={user} />

        {/* Rounded content box */}
        <div className="content-box-glow" style={{ position: 'relative', margin: '20px 12px 12px 0', borderRadius: 24, minHeight: 'calc(100vh - 32px)', border: '12px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'rgba(0,0,0,0.03) 0px 0.6px 2.3px -0.42px, rgba(0,0,0,0.04) 0px 2.3px 8.7px -0.83px, rgba(0,0,0,0.08) 0px 10px 38px -1.25px' }}>

          {/* Gradient background */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', bottom: 0, overflow: 'hidden', borderRadius: 12, zIndex: 0, pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', top: 0, left: '-10%', width: '120%', height: '100%', zIndex: 0,
              background: '#6587F9'
            }} />
          </div>

          {/* Hero title */}
          <div style={{ position: 'relative', zIndex: 2, maxWidth: 1080, margin: '0 auto', padding: '0 28px' }}>
            <div style={{ paddingTop: 80, paddingBottom: 20, textAlign: 'center' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '3.2rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#1A1918', margin: 0 }}>
                Loan Documents
              </h1>
            </div>
          </div>

          {/* Page content */}
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px', position: 'relative', zIndex: 2 }}>

            {/* ── Filter Bar ─────────────────────────────────────── */}
            <div className="glass-card" style={{ padding: '16px 22px', marginBottom: 20, overflow: 'visible', position: 'relative', zIndex: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0 16px', background: 'white', borderRadius: 22,
                  border: '1px solid rgba(0,0,0,0.08)', height: 42, minWidth: 180,
                }}>
                  <Search size={16} style={{ color: '#787776', flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1, border: 'none', outline: 'none', fontSize: 14,
                      fontFamily: "'DM Sans', sans-serif", color: '#1A1918', background: 'transparent',
                    }}
                  />
                </div>
                <SingleSelectDropdown options={ROLE_OPTIONS} selected={roleFilter} onChange={setRoleFilter} />
                <SingleSelectDropdown options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
                <button
                  onClick={clearFilters}
                  style={{
                    marginLeft: 'auto',
                    padding: '8px 14px', borderRadius: 10,
                    border: hasAnyFilter ? '1px solid rgba(232,114,110,0.3)' : '1px solid rgba(0,0,0,0.08)',
                    background: hasAnyFilter ? 'rgba(232,114,110,0.06)' : 'transparent',
                    fontSize: 13, fontWeight: 500,
                    color: hasAnyFilter ? '#E8726E' : '#787776',
                    cursor: hasAnyFilter ? 'pointer' : 'default',
                    opacity: hasAnyFilter ? 1 : 0.5,
                    fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                    transition: 'background 0.15s, opacity 0.15s',
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* ── Agreements List ──────────────────────────────────── */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px 26px 26px' }}>
                {filteredAgreements.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#C7C6C4' }}>
                    <FileText size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <p style={{ fontSize: 13, color: '#787776', margin: 0 }}>
                      {agreements.length === 0
                        ? 'Your signed loan agreements will appear here'
                        : 'No agreements match the current filters'}
                    </p>
                    {hasAnyFilter && <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0' }}>Try adjusting your filters</p>}
                  </div>
                ) : (
                  <>
                    {/* Desktop table header */}
                    <div className="la-table-header" style={{
                      display: 'none', alignItems: 'center', padding: '0 14px 12px',
                      borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 8,
                    }}>
                      <span style={{ width: 80, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>Date</span>
                      <span style={{ flex: 1.5, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 0, paddingLeft: 4 }}>Friend</span>
                      <span style={{ flex: 1.2, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 0, paddingLeft: 4 }}>Category</span>
                      <span style={{ width: 130, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', flexShrink: 0 }}>Status</span>
                      <span style={{ width: 100, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', flexShrink: 0 }}>Amount</span>
                      <div style={{ width: 32, flexShrink: 0 }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {filteredAgreements.map((agreement) => {
                        const isLender = agreement.lender_id === user?.id;
                        const otherPartyId = isLender ? agreement.borrower_id : agreement.lender_id;
                        const otherParty = getUserById(otherPartyId);
                        const loanStatus = getLoanStatus(agreement.loan_id);
                        const badgeStyle = getStatusBadgeStyle(loanStatus);
                        const isExpanded = expandedId === agreement.id;
                        const categoryLabel = isLender ? 'Borrowed from you' : 'Lent to you';
                        const dateDisplay = agreement.created_at ? format(new Date(agreement.created_at), 'M/dd') : '';
                        const dateYear = agreement.created_at ? new Date(agreement.created_at).getFullYear() : null;
                        const dateFormatted = dateYear && dateYear < new Date().getFullYear()
                          ? format(new Date(agreement.created_at), 'M/d/yyyy')
                          : dateDisplay;

                        return (
                          <div key={agreement.id}>
                            <div
                              onClick={() => setExpandedId(isExpanded ? null : agreement.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                                borderRadius: isExpanded ? '12px 12px 0 0' : 12,
                                background: 'rgba(0,0,0,0.03)', transition: 'background 0.15s', cursor: 'pointer',
                              }}
                            >
                              {/* Mobile layout */}
                              <div className="la-mobile-content" style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {categoryLabel} · {otherParty.full_name} · {formatMoney(agreement.total_amount)}
                                </p>
                                <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>
                                  {agreement.created_at ? format(new Date(agreement.created_at), 'MMM d, yyyy') : ''} · {loanStatus}
                                </p>
                              </div>
                              <div className="la-mobile-status">
                                <span style={{
                                  ...badgeStyle, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                  textTransform: 'capitalize', whiteSpace: 'nowrap',
                                }}>
                                  {loanStatus}
                                </span>
                              </div>

                              {/* Desktop layout */}
                              <span className="la-desktop-date" style={{ display: 'none', width: 80, fontSize: 12, fontWeight: 500, color: '#787776', flexShrink: 0 }}>
                                {dateFormatted}
                              </span>
                              <div className="la-desktop-friend" style={{ display: 'none', flex: 1.5, minWidth: 0, alignItems: 'center', gap: 8, paddingLeft: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {otherParty.full_name}
                                </span>
                              </div>
                              <div className="la-desktop-category" style={{ display: 'none', flex: 1.2, minWidth: 0, alignItems: 'center', gap: 6, paddingLeft: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 500, color: isLender ? '#678AFB' : '#A79DEA' }}>{categoryLabel}</span>
                              </div>
                              <div className="la-desktop-status" style={{ display: 'none', width: 130, justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{
                                  ...badgeStyle, display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 8,
                                  fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                                }}>
                                  {loanStatus}
                                </span>
                              </div>
                              <span className="la-desktop-amount" style={{ display: 'none', width: 100, fontSize: 13, fontWeight: 600, color: '#1A1918', textAlign: 'right', flexShrink: 0 }}>
                                {formatMoney(agreement.total_amount)}
                              </span>

                              {/* Expand arrow */}
                              <div style={{
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
                                padding: '16px 14px',
                                background: 'rgba(0,0,0,0.02)', borderRadius: '0 0 12px 12px',
                                borderTop: '1px solid rgba(0,0,0,0.04)',
                                display: 'flex', gap: 8, flexWrap: 'wrap',
                              }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openPopup('promissory', agreement); }}
                                  style={{
                                    padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
                                    background: 'white', fontSize: 12, fontWeight: 500, color: '#1A1918',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(103,138,251,0.06)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                >
                                  <FileText size={14} style={{ color: '#678AFB' }} />
                                  Promissory Note
                                  <div
                                    style={{ position: 'relative' }}
                                    onMouseEnter={(e) => { e.stopPropagation(); setActiveInfoTooltip(`promissory-${agreement.id}`); }}
                                    onMouseLeave={() => setActiveInfoTooltip(null)}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(103,138,251,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: '#678AFB' }}>i</span>
                                    </div>
                                    {activeInfoTooltip === `promissory-${agreement.id}` && (
                                      <div style={{ position: 'absolute', left: 24, top: 0, zIndex: 50, width: 224, background: '#1A1918', color: 'white', fontSize: 11, borderRadius: 10, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', whiteSpace: 'normal' }}>
                                        A promissory note is a legal document where the borrower promises to repay the loan amount plus any interest by a specific date.
                                      </div>
                                    )}
                                  </div>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openPopup('amortization', agreement); }}
                                  style={{
                                    padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
                                    background: 'white', fontSize: 12, fontWeight: 500, color: '#1A1918',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(103,138,251,0.06)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                >
                                  <FileText size={14} style={{ color: '#A79DEA' }} />
                                  Amortization Schedule
                                  <div
                                    style={{ position: 'relative' }}
                                    onMouseEnter={(e) => { e.stopPropagation(); setActiveInfoTooltip(`amortization-${agreement.id}`); }}
                                    onMouseLeave={() => setActiveInfoTooltip(null)}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(103,138,251,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: '#678AFB' }}>i</span>
                                    </div>
                                    {activeInfoTooltip === `amortization-${agreement.id}` && (
                                      <div style={{ position: 'absolute', left: 24, top: 0, zIndex: 50, width: 224, background: '#1A1918', color: 'white', fontSize: 11, borderRadius: 10, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', whiteSpace: 'normal' }}>
                                        An amortization schedule shows the breakdown of each payment over the life of the loan, including how much goes toward principal vs. interest.
                                      </div>
                                    )}
                                  </div>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openPopup('summary', agreement); }}
                                  style={{
                                    padding: '8px 16px', borderRadius: 10, border: 'none',
                                    background: '#1A1918', fontSize: 12, fontWeight: 500, color: 'white',
                                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                                    transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#333'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#1A1918'}
                                >
                                  Loan Summary
                                </button>
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

          </div>
        </div>{/* end content box */}
        <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 11, color: '#787776' }}>Terms of Service</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Privacy Center</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Do not sell or share my personal information</span>
          </div>
        </div>
      </div>
    </>
  );
}

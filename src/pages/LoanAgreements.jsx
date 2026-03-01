import React, { useState, useEffect } from "react";
import { LoanAgreement, User, PublicProfile, Loan, Payment } from "@/entities/all";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Download, ChevronDown, X, Calendar, DollarSign, Percent, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, addMonths, addWeeks, addDays } from "date-fns";
import { jsPDF } from "jspdf";
import LoanActivity from "../components/loans/LoanActivity";
import { formatMoney } from "@/components/utils/formatMoney";

export default function LoanAgreements() {
  const [agreements, setAgreements] = useState([]);
  const [user, setUser] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [roleFilter, setRoleFilter] = useState('both');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activePopup, setActivePopup] = useState(null); // 'promissory', 'amortization', 'summary'
  const [popupAgreement, setPopupAgreement] = useState(null);
  const [activeInfoTooltip, setActiveInfoTooltip] = useState(null); // 'promissory' or 'amortization'

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

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Generate amortization schedule
  const generateAmortizationSchedule = (agreement) => {
    const schedule = [];
    const principal = agreement.amount || 0;
    const totalAmount = agreement.total_amount || principal;
    const paymentAmount = agreement.payment_amount || 0;
    const frequency = agreement.payment_frequency || 'monthly';
    const interestRate = agreement.interest_rate || 0;

    if (paymentAmount <= 0) return schedule;

    let remainingBalance = totalAmount;
    let currentDate = new Date(agreement.created_at);
    let paymentNumber = 1;
    let principalToDate = 0;
    let interestToDate = 0;

    while (remainingBalance > 0.01 && paymentNumber <= 120) {
      // Advance date based on frequency
      if (frequency === 'weekly') {
        currentDate = addWeeks(currentDate, 1);
      } else if (frequency === 'biweekly') {
        currentDate = addWeeks(currentDate, 2);
      } else if (frequency === 'daily') {
        currentDate = addDays(currentDate, 1);
      } else {
        currentDate = addMonths(currentDate, 1);
      }

      const startingBalance = remainingBalance;
      const payment = Math.min(paymentAmount, remainingBalance);
      const interestPortion = (remainingBalance * (interestRate / 100)) / 12;
      const principalPortion = payment - interestPortion > 0 ? payment - interestPortion : payment;
      remainingBalance = Math.max(0, remainingBalance - payment);

      principalToDate += principalPortion;
      interestToDate += interestPortion > 0 ? interestPortion : 0;

      schedule.push({
        number: paymentNumber,
        date: new Date(currentDate),
        startingBalance: startingBalance,
        payment: payment,
        principal: principalPortion,
        interest: interestPortion > 0 ? interestPortion : 0,
        principalToDate: principalToDate,
        interestToDate: interestToDate,
        endingBalance: remainingBalance
      });

      paymentNumber++;
    }

    return schedule;
  };

  // Download Promissory Note PDF
  const downloadPromissoryNote = (agreement) => {
    const doc = new jsPDF();
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);

    // Page 1: Current/Final Terms
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

    // Principal amount box
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 68, 170, 25, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('PRINCIPAL AMOUNT', 25, 78);
    doc.setFontSize(20);
    doc.text(formatMoney(agreement.amount), 25, 88);

    // Promise to pay
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    let yPos = 105;
    const promiseText = `FOR VALUE RECEIVED, the undersigned Borrower, ${borrowerInfo.full_name} (@${borrowerInfo.username}), promises to pay to the order of ${lenderInfo.full_name} (@${lenderInfo.username}), hereinafter referred to as "Lender", the principal sum of ${formatMoney(agreement.amount)}, together with interest at the rate of ${agreement.interest_rate}% per annum.`;
    const promiseLines = doc.splitTextToSize(promiseText, 170);
    doc.text(promiseLines, 20, yPos);
    yPos += promiseLines.length * 6 + 10;

    // Terms section
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

    // Default clause
    yPos += 5;
    doc.setFont(undefined, 'bold');
    doc.text('DEFAULT:', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    const defaultText = 'In the event of default in payment of any installment when due, the entire unpaid balance shall, at the option of the Lender, become immediately due and payable.';
    const defaultLines = doc.splitTextToSize(defaultText, 170);
    doc.text(defaultLines, 20, yPos);
    yPos += defaultLines.length * 6 + 15;

    // Signatures
    doc.setFont(undefined, 'bold');
    doc.text('SIGNATURES:', 20, yPos);
    yPos += 12;

    // Borrower signature
    doc.setFont(undefined, 'normal');
    doc.text('Borrower:', 20, yPos);
    doc.setFont(undefined, 'italic');
    doc.setFontSize(16);
    doc.text(agreement.borrower_name || borrowerInfo.full_name, 20, yPos + 10);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Signed: ${format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy h:mm a')}`, 20, yPos + 18);

    // Lender signature
    doc.setFontSize(11);
    doc.text('Lender:', 120, yPos);
    doc.setFont(undefined, 'italic');
    doc.setFontSize(16);
    doc.text(agreement.lender_name || lenderInfo.full_name, 120, yPos + 10);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Signed: ${format(new Date(agreement.lender_signed_date), 'MMM d, yyyy h:mm a')}`, 120, yPos + 18);

    // Check for term modifications and add additional pages
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

    // Summary box
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 48, 257, 20, 'F');
    doc.setFontSize(10);
    doc.text(`Principal: ${formatMoney(agreement.amount)}`, 25, 58);
    doc.text(`Interest Rate: ${agreement.interest_rate}%`, 95, 58);
    doc.text(`Total Amount: ${formatMoney(agreement.total_amount)}`, 155, 58);
    doc.text(`Payment: ${formatMoney(agreement.payment_amount)} ${agreement.payment_frequency}`, 215, 58);

    // Table header
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

    // Totals
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

  // Open popup
  const openPopup = (type, agreement) => {
    setActivePopup(type);
    setPopupAgreement(agreement);
  };

  const closePopup = () => {
    setActivePopup(null);
    setPopupAgreement(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-96">
          <Card style={{backgroundColor: `rgb(var(--theme-card-bg))`}}>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{borderColor: `rgb(var(--theme-primary))`}}></div>
                <p className="text-slate-600">Loading agreements...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const lendingAgreements = agreements.filter(a => a.lender_id === user?.id);
  const borrowingAgreements = agreements.filter(a => a.borrower_id === user?.id);

  // Promissory Note Popup Content
  const PromissoryNotePopup = ({ agreement }) => {
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);

    return (
      <div className="space-y-6">
        <div className="text-center border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">PROMISSORY NOTE</h2>
          <p className="text-sm text-slate-500 mt-1">Document ID: {agreement.id}</p>
        </div>

        <div className="bg-[#96FFD0] rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Principal Amount</p>
          <p className="text-3xl font-bold text-slate-800">{formatMoney(agreement.amount)}</p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="leading-relaxed">
            FOR VALUE RECEIVED, the undersigned Borrower, <span className="font-semibold">{borrowerInfo.full_name}</span> (@{borrowerInfo.username}),
            promises to pay to the order of <span className="font-semibold">{lenderInfo.full_name}</span> (@{lenderInfo.username}),
            the principal sum of <span className="font-semibold">{formatMoney(agreement.amount)}</span>,
            together with interest at the rate of <span className="font-semibold">{agreement.interest_rate}%</span> per annum.
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
            <p className="text-xs text-slate-500 mt-1">Signed {format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy')}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 mb-1">Lender</p>
            <p className="text-lg font-serif italic text-slate-800">{agreement.lender_name || lenderInfo.full_name}</p>
            <p className="text-xs text-slate-500 mt-1">Signed {format(new Date(agreement.lender_signed_date), 'MMM d, yyyy')}</p>
          </div>
        </div>

        <Button
          onClick={() => downloadPromissoryNote(agreement)}
          className="w-full bg-[#00A86B] hover:bg-[#0D9B76] text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>
    );
  };

  // Amortization Schedule Popup Content
  const AmortizationSchedulePopup = ({ agreement }) => {
    const schedule = generateAmortizationSchedule(agreement);
    const loan = getLoanById(agreement.loan_id);
    const paidPayments = loan?.amount_paid ? Math.floor(loan.amount_paid / agreement.payment_amount) : 0;

    return (
      <div className="space-y-6">
        <div className="text-center border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">AMORTIZATION SCHEDULE</h2>
          <p className="text-sm text-slate-500 mt-1">{schedule.length} payments · {agreement.payment_frequency}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#AAFFA3] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-600">Principal</p>
            <p className="text-lg font-bold text-slate-800">{formatMoney(agreement.amount)}</p>
          </div>
          <div className="bg-[#30FFA8] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-600">Interest</p>
            <p className="text-lg font-bold text-slate-800">{formatMoney((agreement.total_amount || 0) - (agreement.amount || 0))}</p>
          </div>
          <div className="bg-[#96FFD0] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-600">Total</p>
            <p className="text-lg font-bold text-slate-800">{formatMoney(agreement.total_amount)}</p>
          </div>
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
                <tr
                  key={row.number}
                  className={index < paidPayments ? 'bg-green-50' : ''}
                >
                  <td className="px-2 py-2 text-slate-600">
                    {index < paidPayments && <CheckCircle className="w-3 h-3 text-green-500 inline mr-1" />}
                    {row.number}
                  </td>
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

        <Button
          onClick={() => downloadAmortizationSchedule(agreement)}
          className="w-full bg-[#00A86B] hover:bg-[#0D9B76] text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>
    );
  };

  // Loan Summary Popup Content (same as original details)
  const LoanSummaryPopup = ({ agreement }) => {
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);
    const loanStatus = getLoanStatus(agreement.loan_id);
    const loan = getLoanById(agreement.loan_id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Loan Summary</h2>
            <p className="text-sm text-slate-500 mt-1">{format(new Date(agreement.created_at), 'MMMM d, yyyy')}</p>
          </div>
          <Badge className={`${getStatusColor(loanStatus)} capitalize`}>{loanStatus}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#6EE8B5] rounded-xl p-4">
            <p className="text-xs text-slate-600 mb-1">Loan Amount</p>
            <p className="text-2xl font-bold text-slate-800">{formatMoney(agreement.amount)}</p>
          </div>
          <div className="bg-[#30FFA8] rounded-xl p-4">
            <p className="text-xs text-slate-600 mb-1">Total Due</p>
            <p className="text-2xl font-bold text-[#00A86B]">{formatMoney(agreement.total_amount)}</p>
          </div>
        </div>

        {loan && (
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600">Payment Progress</span>
              <span className="text-sm font-medium text-slate-800">
                {formatMoney(loan.amount_paid || 0)} / {formatMoney(agreement.total_amount)}
              </span>
            </div>
            <div className="w-full bg-white rounded-full h-2">
              <div
                className="bg-[#00A86B] h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((loan.amount_paid || 0) / agreement.total_amount) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Interest Rate</p>
                <p className="font-semibold text-slate-800">{agreement.interest_rate}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Payment Amount</p>
                <p className="font-semibold text-slate-800">{formatMoney(agreement.payment_amount)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Payment Frequency</p>
                <p className="font-semibold text-slate-800 capitalize">{agreement.payment_frequency}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Due Date</p>
                <p className="font-semibold text-slate-800">{agreement.due_date ? format(new Date(agreement.due_date), 'MMM d, yyyy') : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-semibold text-slate-800 mb-3">Parties</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <img
                src={lenderInfo.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((lenderInfo.full_name || 'L').charAt(0))}&background=22c55e&color=fff&size=64`}
                alt={lenderInfo.full_name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-xs text-slate-500">Lender</p>
                <p className="font-medium text-slate-800">{lenderInfo.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={borrowerInfo.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((borrowerInfo.full_name || 'B').charAt(0))}&background=22c55e&color=fff&size=64`}
                alt={borrowerInfo.full_name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-xs text-slate-500">Borrower</p>
                <p className="font-medium text-slate-800">{borrowerInfo.full_name}</p>
              </div>
            </div>
          </div>
        </div>

        {agreement.purpose && (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Purpose</p>
            <p className="text-slate-800">{agreement.purpose}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Popup Modal */}
      <AnimatePresence>
        {activePopup && popupAgreement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={closePopup}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#DBFFEB] flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#00A86B]" />
                  </div>
                  <span className="font-medium text-slate-800">
                    {activePopup === 'promissory' && 'Promissory Note'}
                    {activePopup === 'amortization' && 'Amortization Schedule'}
                    {activePopup === 'summary' && 'Loan Summary'}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={closePopup} className="text-slate-500 hover:text-slate-800">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6">
                {activePopup === 'promissory' && <PromissoryNotePopup agreement={popupAgreement} />}
                {activePopup === 'amortization' && <AmortizationSchedulePopup agreement={popupAgreement} />}
                {activePopup === 'summary' && <LoanSummaryPopup agreement={popupAgreement} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen p-4 md:p-6 overflow-x-hidden" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-4xl mx-auto space-y-6 overflow-hidden">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-5">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-left">Document Center</h1>
          </motion.div>

          {/* Role Filter Label + Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-lg font-bold text-slate-800 tracking-tight mb-3">
              You are the:
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'lender', label: 'Lender' },
                { id: 'borrower', label: 'Borrower' },
                { id: 'both', label: 'View Both' },
              ].map(tab => (
                <Button
                  key={tab.id}
                  onClick={() => setRoleFilter(tab.id)}
                  variant={roleFilter === tab.id ? 'default' : 'outline'}
                  className={`whitespace-nowrap ${
                    roleFilter === tab.id
                      ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                      : 'bg-white border-0 text-slate-600 hover:bg-[#DBFFEB]'
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Agreements List with Status Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#DBFFEB] rounded-2xl p-5">
                {/* Header with Status Filter */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                    Loan Agreements
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 gap-2">
                        <span className="capitalize">{statusFilter === 'all' ? 'All Status' : statusFilter}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-white">
                      <DropdownMenuItem onClick={() => setStatusFilter('all')} className={statusFilter === 'all' ? 'bg-slate-100' : ''}>
                        View All
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('active')} className={statusFilter === 'active' ? 'bg-slate-100' : ''}>
                        Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('completed')} className={statusFilter === 'completed' ? 'bg-slate-100' : ''}>
                        Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('cancelled')} className={statusFilter === 'cancelled' ? 'bg-slate-100' : ''}>
                        Cancelled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Filtered Agreements List */}
                {(() => {
                  let filteredAgreements = agreements;
                  if (roleFilter === 'lender') {
                    filteredAgreements = lendingAgreements;
                  } else if (roleFilter === 'borrower') {
                    filteredAgreements = borrowingAgreements;
                  }

                  if (statusFilter !== 'all') {
                    filteredAgreements = filteredAgreements.filter(agreement => {
                      const loanStatus = getLoanStatus(agreement.loan_id);
                      return loanStatus === statusFilter;
                    });
                  }

                  if (filteredAgreements.length === 0) {
                    return (
                      <div className="bg-[#DBFFEB] rounded-xl p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#DBFFEB] flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-[#00A86B]" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Agreements Found</h3>
                        <p className="text-sm text-slate-500">
                          {agreements.length === 0
                            ? "Your signed loan agreements will appear here once you create or accept a loan offer."
                            : "No agreements match the current filters. Try adjusting your filter settings."}
                        </p>
                      </div>
                    );
                  }

                  const colors = ['#AAFFA3', '#30FFA8', '#96FFD0', '#6EE8B5', '#83F384', '#6EE8A2'];

                  return (
                    <div className="space-y-3">
                      {filteredAgreements.map((agreement, index) => {
                        const isLender = agreement.lender_id === user?.id;
                        const otherPartyId = isLender ? agreement.borrower_id : agreement.lender_id;
                        const otherParty = getUserById(otherPartyId);
                        const loanStatus = getLoanStatus(agreement.loan_id);

                        return (
                          <motion.div
                            key={agreement.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-xl"
                            style={{ backgroundColor: colors[index % 6] }}
                          >
                            {/* Desktop Layout */}
                            <div className="hidden md:flex items-center gap-4">
                              {/* Left: Status Badge */}
                              <Badge className={`${getStatusColor(loanStatus)} text-xs capitalize flex-shrink-0`}>
                                {loanStatus}
                              </Badge>

                              {/* Center: User Info */}
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                                  {otherParty.profile_picture_url ? (
                                    <img
                                      src={otherParty.profile_picture_url}
                                      alt={otherParty.full_name}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-lg font-semibold text-[#0A1A10]">
                                      {(otherParty.full_name || otherParty.username || '?').charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 truncate">{otherParty.full_name}</p>
                                  <p className="text-xs text-slate-600 truncate">
                                    {isLender ? 'Borrower' : 'Lender'}: @{otherParty.username} · {formatMoney(agreement.total_amount)}
                                  </p>
                                </div>
                              </div>

                              {/* Right: Three Buttons */}
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  onClick={() => openPopup('promissory', agreement)}
                                  size="sm"
                                  variant="outline"
                                  className="bg-white/80 border-0 hover:bg-white text-slate-700 text-xs flex items-center gap-1"
                                >
                                  Promissory Note
                                  <div
                                    className="relative"
                                    onMouseEnter={(e) => { e.stopPropagation(); setActiveInfoTooltip(`promissory-${agreement.id}`); }}
                                    onMouseLeave={() => setActiveInfoTooltip(null)}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-[#6EE8A2] flex items-center justify-center cursor-help">
                                      <span className="text-[10px] font-bold text-slate-800">i</span>
                                    </div>
                                    {activeInfoTooltip === `promissory-${agreement.id}` && (
                                      <div className="absolute left-6 top-0 z-50 w-56 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-lg whitespace-normal break-words">
                                        A promissory note is a legal document where the borrower promises to repay the loan amount plus any interest by a specific date. It serves as written proof of the debt.
                                      </div>
                                    )}
                                  </div>
                                </Button>
                                <Button
                                  onClick={() => openPopup('amortization', agreement)}
                                  size="sm"
                                  variant="outline"
                                  className="bg-white/80 border-0 hover:bg-white text-slate-700 text-xs flex items-center gap-1"
                                >
                                  Amortization
                                  <div
                                    className="relative"
                                    onMouseEnter={(e) => { e.stopPropagation(); setActiveInfoTooltip(`amortization-${agreement.id}`); }}
                                    onMouseLeave={() => setActiveInfoTooltip(null)}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-[#6EE8A2] flex items-center justify-center cursor-help">
                                      <span className="text-[10px] font-bold text-slate-800">i</span>
                                    </div>
                                    {activeInfoTooltip === `amortization-${agreement.id}` && (
                                      <div className="absolute left-6 top-0 z-50 w-56 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-lg whitespace-normal break-words">
                                        An amortization schedule shows the breakdown of each payment over the life of the loan, including how much goes toward principal vs. interest.
                                      </div>
                                    )}
                                  </div>
                                </Button>
                                <Button
                                  onClick={() => openPopup('summary', agreement)}
                                  size="sm"
                                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs"
                                >
                                  Loan Summary
                                </Button>
                              </div>
                            </div>

                            {/* Mobile Layout */}
                            <div className="md:hidden space-y-3">
                              <div className="flex items-center gap-3">
                                <Badge className={`${getStatusColor(loanStatus)} text-xs capitalize flex-shrink-0`}>
                                  {loanStatus}
                                </Badge>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <img
                                    src={otherParty.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((otherParty.full_name || 'User').charAt(0))}&background=22c55e&color=fff&size=128`}
                                    alt={otherParty.full_name}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-white flex-shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-800 truncate text-sm">{otherParty.full_name}</p>
                                    <p className="text-xs text-slate-600">{formatMoney(agreement.total_amount)}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => openPopup('promissory', agreement)}
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 bg-white/80 border-0 hover:bg-white text-slate-700 text-xs flex items-center justify-center gap-1"
                                >
                                  Note
                                  <div
                                    className="relative"
                                    onMouseEnter={(e) => { e.stopPropagation(); setActiveInfoTooltip(`promissory-mobile-${agreement.id}`); }}
                                    onMouseLeave={() => setActiveInfoTooltip(null)}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-[#6EE8A2] flex items-center justify-center cursor-help">
                                      <span className="text-[10px] font-bold text-slate-800">i</span>
                                    </div>
                                    {activeInfoTooltip === `promissory-mobile-${agreement.id}` && (
                                      <div className="absolute left-6 top-0 z-50 w-56 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-lg whitespace-normal break-words">
                                        A promissory note is a legal document where the borrower promises to repay the loan amount plus any interest by a specific date. It serves as written proof of the debt.
                                      </div>
                                    )}
                                  </div>
                                </Button>
                                <Button
                                  onClick={() => openPopup('amortization', agreement)}
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 bg-white/80 border-0 hover:bg-white text-slate-700 text-xs flex items-center justify-center gap-1"
                                >
                                  Schedule
                                  <div
                                    className="relative"
                                    onMouseEnter={(e) => { e.stopPropagation(); setActiveInfoTooltip(`amortization-mobile-${agreement.id}`); }}
                                    onMouseLeave={() => setActiveInfoTooltip(null)}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-[#6EE8A2] flex items-center justify-center cursor-help">
                                      <span className="text-[10px] font-bold text-slate-800">i</span>
                                    </div>
                                    {activeInfoTooltip === `amortization-mobile-${agreement.id}` && (
                                      <div className="absolute left-6 top-0 z-50 w-56 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-lg whitespace-normal break-words">
                                        An amortization schedule shows the breakdown of each payment over the life of the loan, including how much goes toward principal vs. interest.
                                      </div>
                                    )}
                                  </div>
                                </Button>
                                <Button
                                  onClick={() => openPopup('summary', agreement)}
                                  size="sm"
                                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs"
                                >
                                  Summary
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })()}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

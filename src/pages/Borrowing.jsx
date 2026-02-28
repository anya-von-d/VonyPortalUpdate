import React, { useState, useEffect } from "react";
import { Loan, Payment, User, LoanAgreement, PublicProfile } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock, Calendar, DollarSign, AlertCircle, FileText, ChevronDown, BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, startOfMonth, endOfMonth, isSameMonth } from "date-fns";

import LoanCard from "@/components/loans/LoanCard";
import RecordPaymentModal from "@/components/loans/RecordPaymentModal";
import LoanDetailsModal from "@/components/loans/LoanDetailsModal";
import MyLoanOffers from "@/components/dashboard/MyLoanOffers";
import BorrowerSignatureModal from "@/components/loans/BorrowerSignatureModal";

export default function Borrowing() {
  const [loans, setLoans] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loanToCancel, setLoanToCancel] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [manageLoanSelected, setManageLoanSelected] = useState(null);
  const [rankingFilter, setRankingFilter] = useState('highest_interest'); // 'highest_interest', 'highest_payment', 'soonest_deadline'
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    let currentUser = null;
    try {
      currentUser = await User.me();
      setUser(currentUser);
    } catch (userError) {
      console.log("User not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      const [allLoans, allProfiles] = await Promise.all([
        Loan.list('-created_at').catch(() => []),
        PublicProfile.list().catch(() => [])
      ]);

      const userLoans = (allLoans || []).filter(loan =>
        loan.borrower_id === currentUser.id
      );

      setLoans(userLoans);
      setPublicProfiles(allProfiles || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleMakePayment = (loan) => {
    setSelectedLoan(loan);
    setShowPaymentModal(true);
  };

  const handleViewDetails = (loan) => {
    setSelectedLoanDetails({ loan, type: 'borrowed' });
    setShowDetailsModal(true);
  };

  const handlePaymentComplete = async () => {
    setShowPaymentModal(false);
    setSelectedLoan(null);
    await loadData();
  };

  const handleCancelLoan = (loan) => {
    setLoanToCancel(loan);
    setShowCancelDialog(true);
  };

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

  const handleSignOffer = async (loanId, signature) => {
    try {
      await Loan.update(loanId, { status: 'active' });

      const agreements = await LoanAgreement.list();
      const agreement = agreements.find(a => a.loan_id === loanId);

      if (agreement) {
        await LoanAgreement.update(agreement.id, {
          borrower_name: signature,
          borrower_signed_date: new Date().toISOString(),
          is_fully_signed: true
        });
      }

      setShowSignModal(false);
      setSelectedOffer(null);
      loadData();
    } catch (error) {
      console.error("Error signing loan offer:", error);
    }
  };

  const handleDeclineOffer = async (loanId) => {
    try {
      await Loan.update(loanId, { status: 'declined' });
      loadData();
    } catch (error) {
      console.error("Error declining loan offer:", error);
    }
  };

  const openSignModal = (offer) => {
    setSelectedOffer(offer);
    setShowSignModal(true);
  };

  // Filter loans by status
  const activeLoans = loans.filter(loan => loan.status === 'active');
  const pendingOffers = loans.filter(loan => loan.status === 'pending');
  const completedLoans = loans.filter(loan => loan.status === 'completed' || loan.status === 'cancelled');

  const totalBorrowed = activeLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
  const totalOwed = activeLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);

  // Calculate total paid across all loans
  const calculateTotalPaid = () => {
    let totalPaid = 0;
    activeLoans.forEach(loan => {
      const paidAmount = loan.amount_paid || 0;
      totalPaid += paidAmount;
    });
    return totalPaid;
  };

  const totalPaid = calculateTotalPaid();
  const remainingBalance = totalOwed - totalPaid;

  // Find next payment due
  const nextPaymentLoan = activeLoans
    .filter(loan => loan.next_payment_date)
    .map(loan => ({ ...loan, date: new Date(loan.next_payment_date) }))
    .sort((a, b) => a.date - b.date)[0];

  const getNextPaymentDays = () => {
    if (!nextPaymentLoan) return null;
    const today = new Date();
    const paymentDate = new Date(nextPaymentLoan.date);
    const diffTime = paymentDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const nextPaymentDays = getNextPaymentDays();
  const nextPaymentAmount = nextPaymentLoan?.payment_amount || 0;
  const nextPaymentLenderUsername = nextPaymentLoan
    ? publicProfiles.find(p => p.user_id === nextPaymentLoan.lender_id)?.username || 'user'
    : null;

  // Overall repayment progress
  const overallProgress = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;

  const tabs = [
    { id: 'overview', label: 'All' },
    { id: 'active', label: 'Manage Loans' },
  ];

  return (
    <>
      <div className="min-h-screen p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-4xl mx-auto space-y-7">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-5"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-left">
              Borrowing
            </h1>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                variant={activeSection === tab.id ? 'default' : 'outline'}
                className={`whitespace-nowrap ${
                  activeSection === tab.id
                    ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                    : 'bg-white border-0 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </Button>
            ))}
          </div>

          {/* Content Sections */}
          <AnimatePresence mode="wait">
            {activeSection === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-7"
              >
                {/* Borrowing Overview Section */}
                <div className="bg-[#DBFFEB] rounded-2xl p-5">
                  <p className="text-[11px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                    Borrowing Overview
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Pie Chart */}
                    <div className="rounded-xl p-4 flex flex-col items-center justify-center" style={{ backgroundColor: '#6EE8B5' }}>
                      <p className="text-sm font-medium text-slate-600 mb-3">Repayment Progress</p>
                      {(() => {
                        const percentPaid = totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0;
                        const circumference = 2 * Math.PI * 45;
                        const strokeDashoffset = circumference - (percentPaid / 100) * circumference;

                        return (
                          <div className="relative w-36 h-36">
                            <svg className="w-full h-full transform -rotate-90">
                              {/* Background circle */}
                              <circle
                                cx="72"
                                cy="72"
                                r="45"
                                fill="none"
                                stroke="#e2e8f0"
                                strokeWidth="12"
                              />
                              {/* Progress circle */}
                              <circle
                                cx="72"
                                cy="72"
                                r="45"
                                fill="none"
                                stroke="#35B276"
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-bold text-slate-800">{percentPaid}%</span>
                              <span className="text-xs text-slate-500">Repaid</span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="mt-3 text-center">
                        <p className="text-xs text-slate-500">
                          ${totalPaid.toLocaleString()} of ${totalOwed.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Stats Card - Total Borrowed */}
                    <Card className="backdrop-blur-sm hover:shadow-xl transition-all duration-300 h-full cursor-default border-0 rounded-xl" style={{ backgroundColor: '#83F384' }}>
                      <CardContent className="p-5 flex flex-col items-center justify-center h-full text-center">
                        <p className="text-sm font-medium text-slate-600 mb-2">Total Borrowed</p>
                        <p className="text-lg font-bold text-slate-800">${totalBorrowed.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-1">{activeLoans.length} active loans</p>
                      </CardContent>
                    </Card>

                    {/* Stats Card - Remaining */}
                    <Card className="backdrop-blur-sm hover:shadow-xl transition-all duration-300 h-full cursor-default border-0 rounded-xl" style={{ backgroundColor: '#6EE8B5' }}>
                      <CardContent className="p-5 flex flex-col items-center justify-center h-full text-center">
                        <p className="text-sm font-medium text-slate-600 mb-2">Remaining Balance</p>
                        <p className="text-lg font-bold text-slate-800">${remainingBalance.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-1">${totalPaid.toLocaleString()} paid</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Upcoming Payments + Individual Loan Progress */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Upcoming Payments - Left */}
                  <div className="bg-white rounded-2xl p-5 border-0">
                    <p className="text-[11px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                      Upcoming Payments
                    </p>
                    {activeLoans.filter(l => l.next_payment_date).length === 0 ? (
                      <p className="text-slate-500 text-sm">No upcoming payments</p>
                    ) : (
                      <div className="space-y-3">
                        {activeLoans
                          .filter(l => l.next_payment_date)
                          .sort((a, b) => new Date(a.next_payment_date) - new Date(b.next_payment_date))
                          .slice(0, 3)
                          .map((loan, index) => {
                            const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                            const bgColors = ['#D0ED6F', '#83F384', '#6EE8B5'];
                            return (
                              <div key={loan.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: bgColors[index % 3] }}>
                                <div>
                                  <p className="font-medium text-sm text-slate-800">
                                    ${loan.payment_amount?.toLocaleString() || 0} to @{lender?.username || 'user'}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    Due {format(new Date(loan.next_payment_date), 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                  <span className="text-xs font-bold text-slate-800">
                                    {Math.ceil((new Date(loan.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24))}d
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Individual Loan Progress - Right */}
                  <div className="bg-white rounded-2xl p-5 border-0">
                    <p className="text-[11px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                      Individual Loan Progress
                    </p>
                    {activeLoans.length === 0 ? (
                      <p className="text-slate-500 text-sm">No active loans to track</p>
                    ) : (
                        <div className="space-y-4">
                          {activeLoans.slice(0, 5).map(loan => {
                            const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                            const loanTotalOwed = loan.total_amount || loan.amount || 0;
                            const amountPaid = loan.amount_paid || 0;
                            const percentPaid = loanTotalOwed > 0 ? Math.round((amountPaid / loanTotalOwed) * 100) : 0;

                            return (
                              <div key={loan.id} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#00A86B]/20 flex items-center justify-center">
                                      <span className="text-xs font-medium text-[#00A86B]">
                                        {lender?.full_name?.charAt(0) || '?'}
                                      </span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">@{lender?.username || 'user'}</span>
                                  </div>
                                  <span className="text-xs text-slate-500">{percentPaid}%</span>
                                </div>
                                <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="absolute top-0 left-0 h-full bg-[#00A86B] rounded-full transition-all duration-500"
                                    style={{ width: `${percentPaid}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                  <span>${amountPaid.toLocaleString()} paid</span>
                                  <span>${loanTotalOwed.toLocaleString()} total</span>
                                </div>
                              </div>
                            );
                          })}
                          {activeLoans.length > 5 && (
                            <Button
                              variant="ghost"
                              className="w-full text-[#00A86B] hover:bg-transparent"
                              onClick={() => setActiveSection('active')}
                            >
                              View all {activeLoans.length} loans
                            </Button>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                {/* Pending Offers Alert */}
                {pendingOffers.length > 0 && (
                  <div className="bg-[#DBFFEB] rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#83F384] flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-[#0A1A10]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800 text-base">
                            You have {pendingOffers.length} pending loan offer{pendingOffers.length !== 1 ? 's' : ''}
                          </h3>
                          <p className="text-slate-600 text-xs">
                            Review and respond to loan offers from friends
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setActiveSection('offers')}
                        className="bg-[#00A86B] hover:bg-[#0D9B76] text-white font-semibold gap-2 text-sm"
                      >
                        View Offers
                      </Button>
                    </div>
                  </div>
                )}

                {/* Loans Ranked By */}
                {activeLoans.length > 0 && (
                  <div className="bg-[#DBFFEB] rounded-2xl p-5">
                      {/* Header with dropdown */}
                      <div className="flex items-center gap-2 mb-4">
                        <p className="text-[11px] text-slate-600 uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                          Loans Ranked By
                        </p>
                        <Select value={rankingFilter} onValueChange={setRankingFilter}>
                          <SelectTrigger className="w-auto h-7 text-xs bg-white border-slate-200 gap-1 px-2">
                            <SelectValue>
                              {rankingFilter === 'highest_interest' && 'Highest Interest'}
                              {rankingFilter === 'highest_payment' && 'Highest Payment'}
                              {rankingFilter === 'soonest_deadline' && 'Soonest Payment Deadline'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="highest_interest">Highest Interest</SelectItem>
                            <SelectItem value="highest_payment">Highest Payment</SelectItem>
                            <SelectItem value="soonest_deadline">Soonest Payment Deadline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ranked Loans */}
                      <div className="space-y-3">
                        {(() => {
                          let sortedLoans = [...activeLoans];

                          if (rankingFilter === 'highest_interest') {
                            sortedLoans.sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0));
                          } else if (rankingFilter === 'highest_payment') {
                            sortedLoans.sort((a, b) => (b.payment_amount || 0) - (a.payment_amount || 0));
                          } else if (rankingFilter === 'soonest_deadline') {
                            sortedLoans.sort((a, b) => {
                              const dateA = a.next_payment_date ? new Date(a.next_payment_date) : new Date('2999-12-31');
                              const dateB = b.next_payment_date ? new Date(b.next_payment_date) : new Date('2999-12-31');
                              return dateA - dateB;
                            });
                          }

                          return sortedLoans.map((loan, index) => {
                            const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                            const bgColors = ['#D0ED6F', '#83F384', '#6EE8B5'];

                            return (
                              <motion.div
                                key={loan.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="rounded-xl p-4 flex items-center gap-3"
                                style={{ backgroundColor: bgColors[index % 3] }}
                              >
                                {/* Rank Number */}
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-bold text-slate-800">{index + 1}</span>
                                </div>

                                {/* Loan Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-800 text-sm">
                                      @{lender?.username || 'user'}
                                    </p>
                                    <span className="text-slate-500 text-xs">•</span>
                                    <p className="text-sm text-slate-700">
                                      ${(loan.amount || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                                    {rankingFilter === 'highest_interest' && (
                                      <span className="font-medium text-slate-700">{loan.interest_rate || 0}% interest</span>
                                    )}
                                    {rankingFilter === 'highest_payment' && (
                                      <span className="font-medium text-slate-700">${(loan.payment_amount || 0).toLocaleString()} / {loan.payment_frequency || 'month'}</span>
                                    )}
                                    {rankingFilter === 'soonest_deadline' && loan.next_payment_date && (
                                      <span className="font-medium text-slate-700">
                                        Due {format(new Date(loan.next_payment_date), 'MMM d, yyyy')}
                                      </span>
                                    )}
                                    {rankingFilter === 'soonest_deadline' && !loan.next_payment_date && (
                                      <span className="font-medium text-slate-500">No payment date set</span>
                                    )}
                                  </div>
                                </div>

                                {/* Amount remaining */}
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs text-slate-500">Remaining</p>
                                  <p className="font-semibold text-slate-800 text-sm">
                                    ${((loan.total_amount || loan.amount || 0) - (loan.amount_paid || 0)).toLocaleString()}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          });
                        })()}
                      </div>
                  </div>
                )}

                {/* Month Payment Amount Box */}
                {(() => {
                  const monthEnd = endOfMonth(selectedMonth);
                  let totalSend = 0;

                  activeLoans.forEach(loan => {
                    if (!loan.next_payment_date) return;
                    const paymentDate = new Date(loan.next_payment_date);
                    const paymentAmount = loan.payment_amount || 0;

                    const addAmountIfInMonth = (date) => {
                      if (isSameMonth(date, selectedMonth)) {
                        totalSend += paymentAmount;
                      }
                    };

                    addAmountIfInMonth(paymentDate);

                    const frequency = loan.payment_frequency;
                    if (frequency && frequency !== 'none') {
                      let currentDate = new Date(loan.next_payment_date);
                      let iterations = 0;
                      while (iterations < 10) {
                        if (frequency === 'weekly') {
                          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
                        } else if (frequency === 'biweekly') {
                          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 14));
                        } else if (frequency === 'monthly') {
                          currentDate = addMonths(currentDate, 1);
                        } else if (frequency === 'daily') {
                          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
                        } else {
                          break;
                        }
                        if (currentDate > monthEnd) break;
                        addAmountIfInMonth(currentDate);
                        iterations++;
                      }
                    }
                  });

                  return (
                    <div className="bg-[#83F384] rounded-xl p-3 flex items-center justify-between">
                      <p className="text-[11px] text-[#0A1A10] uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                        {format(selectedMonth, 'MMMM')} Payment Amount
                      </p>
                      <p className="text-sm font-bold text-[#0A1A10]">
                        -${totalSend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  );
                })()}

                {/* Month Payment Overview Box */}
                <div className="bg-[#DBFFEB] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                        className="flex items-center gap-2 text-[11px] text-slate-600 uppercase tracking-[0.12em] font-medium hover:text-slate-800 transition-colors"
                        style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                      >
                        {format(selectedMonth, 'MMMM')} Payment Overview
                        <ChevronDown className={`w-4 h-4 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showMonthDropdown && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowMonthDropdown(false)} />
                          <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border z-20 py-2 min-w-[160px]">
                            {Array.from({ length: 12 }, (_, i) => {
                              const monthDate = new Date(new Date().getFullYear(), i, 1);
                              return (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setSelectedMonth(monthDate);
                                    setShowMonthDropdown(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[#DBFFEB] transition-colors ${
                                    isSameMonth(monthDate, selectedMonth) ? 'bg-[#DBFFEB] font-medium text-[#00A86B]' : 'text-slate-700'
                                  }`}
                                >
                                  {format(monthDate, 'MMMM')}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1" style={{
                    maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
                  }}>
                    {(() => {
                      const monthEnd = endOfMonth(selectedMonth);
                      const events = [];

                      activeLoans.forEach(loan => {
                        if (!loan.next_payment_date) return;

                        const paymentDate = new Date(loan.next_payment_date);
                        const lender = publicProfiles.find(p => p.user_id === loan.lender_id);

                        const addEventIfInMonth = (date) => {
                          if (isSameMonth(date, selectedMonth)) {
                            events.push({
                              date: new Date(date),
                              amount: loan.payment_amount || 0,
                              username: lender?.username || 'user'
                            });
                          }
                        };

                        addEventIfInMonth(paymentDate);

                        const frequency = loan.payment_frequency;
                        if (frequency && frequency !== 'none') {
                          let currentDate = new Date(loan.next_payment_date);
                          let iterations = 0;
                          while (iterations < 10) {
                            if (frequency === 'weekly') {
                              currentDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
                            } else if (frequency === 'biweekly') {
                              currentDate = new Date(currentDate.setDate(currentDate.getDate() + 14));
                            } else if (frequency === 'monthly') {
                              currentDate = addMonths(currentDate, 1);
                            } else if (frequency === 'daily') {
                              currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
                            } else {
                              break;
                            }
                            if (currentDate > monthEnd) break;
                            addEventIfInMonth(currentDate);
                            iterations++;
                          }
                        }
                      });

                      events.sort((a, b) => a.date - b.date);

                      if (events.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                            <Calendar className="w-10 h-10 opacity-40 mb-2" />
                            <p className="text-sm">No payments due this month</p>
                          </div>
                        );
                      }

                      const colors = ['#D0ED6F', '#83F384', '#6EE8B5'];

                      return events.map((event, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ backgroundColor: colors[index % 3] }}
                        >
                          <div className="bg-[#DBFFEB] rounded-lg px-3 py-2 flex-shrink-0 text-center min-w-[50px]">
                            <p className="text-xs text-slate-500 uppercase" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                              {format(event.date, 'MMM')}
                            </p>
                            <p className="text-lg font-bold text-slate-800">
                              {format(event.date, 'd')}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              <span className="text-red-600">Send</span>
                              {' '}
                              <span className="font-bold">${event.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              {' '}
                              <span className="text-slate-600">to</span>
                              {' '}
                              <span className="font-medium">@{event.username}</span>
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <polyline points="19 12 12 19 5 12"></polyline>
                            </svg>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'active' && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : activeLoans.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border-0">
                    <div className="text-center text-[#4A6B55]">
                      <p className="text-4xl mb-3">✓</p>
                      <p>No active loans</p>
                      <p className="text-sm">You're all caught up!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Loan Selector Dropdown */}
                    <div className="bg-white rounded-2xl p-5 border-0">
                      <p className="text-[11px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                        Manage Loans
                      </p>
                        <Select
                          value={manageLoanSelected?.id || ''}
                          onValueChange={(value) => {
                            const loan = activeLoans.find(l => l.id === value);
                            setManageLoanSelected(loan || null);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a loan to manage...">
                              {manageLoanSelected && (() => {
                                const lender = publicProfiles.find(p => p.user_id === manageLoanSelected.lender_id);
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#00A86B]/20 flex items-center justify-center">
                                      <span className="text-xs font-medium text-[#00A86B]">
                                        {lender?.full_name?.charAt(0) || '?'}
                                      </span>
                                    </div>
                                    <span>@{lender?.username || 'user'}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-[#00A86B] font-medium">${manageLoanSelected.amount?.toLocaleString()}</span>
                                    {manageLoanSelected.purpose && (
                                      <>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-slate-500 truncate">{manageLoanSelected.purpose}</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {activeLoans.map((loan) => {
                              const lender = publicProfiles.find(p => p.user_id === loan.lender_id);
                              return (
                                <SelectItem key={loan.id} value={loan.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#00A86B]/20 flex items-center justify-center">
                                      <span className="text-xs font-medium text-[#00A86B]">
                                        {lender?.full_name?.charAt(0) || '?'}
                                      </span>
                                    </div>
                                    <span>@{lender?.username || 'user'}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-[#00A86B] font-medium">${loan.amount?.toLocaleString()}</span>
                                    {loan.purpose && (
                                      <>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-slate-500">{loan.purpose}</span>
                                      </>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                    </div>

                    {/* Loan Details - Below Dropdown */}
                    {!manageLoanSelected ? (
                      <div className="bg-white rounded-2xl p-5 border-0 flex items-center justify-center py-16">
                        <div className="text-center text-[#4A6B55]">
                          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Select a loan above to view details</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Loan Information Box */}
                        <div className="bg-[#DBFFEB] rounded-2xl p-5">
                          <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                            Loan Information
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-[#D0ED6F] rounded-xl p-4">
                              <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Amount</p>
                              <p className="text-xl font-bold text-slate-800">
                                ${(manageLoanSelected.amount || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-[#83F384] rounded-xl p-4">
                              <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Interest</p>
                              <p className="text-xl font-bold text-slate-800">
                                {manageLoanSelected.interest_rate || 0}%
                              </p>
                            </div>
                            <div className="bg-[#6EE8B5] rounded-xl p-4">
                              <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Term</p>
                              <p className="text-xl font-bold text-slate-800">
                                {manageLoanSelected.repayment_period || 0} {manageLoanSelected.repayment_unit || 'months'}
                              </p>
                            </div>
                            <div className="bg-[#C2FFDC] rounded-xl p-4">
                              <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Payment</p>
                              <p className="text-xl font-bold text-slate-800">
                                ${(manageLoanSelected.payment_amount || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Progress Pie Chart + Next Payment + Payment Amount */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Pie Chart - Left */}
                          <div className="bg-[#DBFFEB] rounded-2xl p-5">
                            <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                              Payment Progress
                            </p>
                            <div className="flex flex-col items-center">
                              {(() => {
                                const totalOwed = manageLoanSelected.total_amount || manageLoanSelected.amount || 0;
                                const amountPaid = manageLoanSelected.amount_paid || 0;
                                const remaining = totalOwed - amountPaid;
                                const percentPaid = totalOwed > 0 ? Math.round((amountPaid / totalOwed) * 100) : 0;
                                const circumference = 2 * Math.PI * 45;
                                const strokeDashoffset = circumference - (percentPaid / 100) * circumference;

                                return (
                                  <>
                                    <div className="relative w-32 h-32">
                                      <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="64" cy="64" r="45" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                        <circle
                                          cx="64"
                                          cy="64"
                                          r="45"
                                          fill="none"
                                          stroke="#00A86B"
                                          strokeWidth="12"
                                          strokeLinecap="round"
                                          strokeDasharray={circumference}
                                          strokeDashoffset={strokeDashoffset}
                                          className="transition-all duration-500"
                                        />
                                      </svg>
                                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-slate-800">{percentPaid}%</span>
                                        <span className="text-xs text-slate-500">Paid</span>
                                      </div>
                                    </div>
                                    <div className="mt-3 text-center space-y-1">
                                      <p className="text-xs text-slate-600">
                                        <span className="text-[#00A86B] font-semibold">${amountPaid.toLocaleString()}</span> paid
                                      </p>
                                      <p className="text-xs text-slate-600">
                                        <span className="text-slate-800 font-semibold">${remaining.toLocaleString()}</span> remaining
                                      </p>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Next Payment Date - Middle */}
                          <div className="bg-[#83F384] rounded-2xl p-5 flex flex-col">
                            <p className="text-[10px] text-slate-700 uppercase tracking-[0.12em] font-medium mb-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                              Next Payment Date
                            </p>
                            <div className="flex-1 flex flex-col items-center justify-center">
                              <p className="text-2xl font-bold text-slate-800">
                                {manageLoanSelected.next_payment_date
                                  ? format(new Date(manageLoanSelected.next_payment_date), 'MMM d, yyyy')
                                  : 'N/A'}
                              </p>
                              {manageLoanSelected.next_payment_date && (
                                <div className="mt-2 px-3 py-1 bg-white rounded-full">
                                  <p className="text-sm font-semibold text-[#00A86B]">
                                    {(() => {
                                      const days = Math.ceil((new Date(manageLoanSelected.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24));
                                      return days > 0 ? `${days} day${days !== 1 ? 's' : ''} away` : days === 0 ? 'Due today' : `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
                                    })()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Payment Amount - Right */}
                          <div className="bg-[#6EE8B5] rounded-2xl p-5 flex flex-col">
                            <p className="text-[10px] text-slate-700 uppercase tracking-[0.12em] font-medium mb-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                              Payment Amount
                            </p>
                            <div className="flex-1 flex flex-col items-center justify-center">
                              <p className="text-3xl font-bold text-slate-800">
                                ${(manageLoanSelected.payment_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-sm text-slate-600 mt-1 capitalize">
                                {manageLoanSelected.payment_frequency || 'One-time'} payment
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Interest + Loan Amounts */}
                        <div className="space-y-4">
                          <div className="bg-[#DBFFEB] rounded-2xl p-5">
                            <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                              Interest
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-[#D0ED6F] rounded-xl p-4">
                                <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Interest Accrued</p>
                                <p className="text-xl font-bold text-slate-800">
                                  ${(() => {
                                    const principal = manageLoanSelected.amount || 0;
                                    const total = manageLoanSelected.total_amount || principal;
                                    return (total - principal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  })()}
                                </p>
                              </div>
                              <div className="bg-[#83F384] rounded-xl p-4">
                                <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Predicted Interest</p>
                                <p className="text-xl font-bold text-slate-800">
                                  ${(() => {
                                    const principal = manageLoanSelected.amount || 0;
                                    const rate = (manageLoanSelected.interest_rate || 0) / 100;
                                    const period = manageLoanSelected.repayment_period || 12;
                                    const unit = manageLoanSelected.repayment_unit || 'months';
                                    const years = unit === 'months' ? period / 12 : period / 52;
                                    return (principal * rate * years).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                          {/* Total Remaining + Amount Paid */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#D0ED6F] rounded-2xl p-5">
                              <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                                Total Remaining
                              </p>
                              <p className="text-2xl font-bold text-slate-800">
                                ${(() => {
                                  const total = manageLoanSelected.total_amount || manageLoanSelected.amount || 0;
                                  const paid = manageLoanSelected.amount_paid || 0;
                                  return (total - paid).toLocaleString();
                                })()}
                              </p>
                            </div>
                            <div className="bg-[#83F384] rounded-2xl p-5">
                              <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                                Amount Paid
                              </p>
                              <p className="text-2xl font-bold text-[#00A86B]">
                                ${(manageLoanSelected.amount_paid || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions Box */}
                        <div className="bg-[#DBFFEB] rounded-2xl p-5">
                          <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                            Actions
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                              onClick={() => handleMakePayment(manageLoanSelected)}
                              className="bg-[#D0ED6F] rounded-xl p-4 text-left hover:opacity-90 transition-opacity cursor-pointer group"
                            >
                              <div className="w-10 h-10 rounded-full bg-[#DBFFEB] flex items-center justify-center mb-3">
                                <DollarSign className="w-5 h-5 text-slate-700" />
                              </div>
                              <p className="font-semibold text-slate-800 text-sm group-hover:text-[#00A86B] transition-colors">
                                Make Payment
                              </p>
                              <p className="text-xs text-slate-600 mt-1">Submit a payment</p>
                            </button>
                            <button
                              onClick={() => handleViewDetails(manageLoanSelected)}
                              className="bg-[#83F384] rounded-xl p-4 text-left hover:opacity-90 transition-opacity cursor-pointer group"
                            >
                              <div className="w-10 h-10 rounded-full bg-[#DBFFEB] flex items-center justify-center mb-3">
                                <FileText className="w-5 h-5 text-slate-700" />
                              </div>
                              <p className="font-semibold text-slate-800 text-sm group-hover:text-[#00A86B] transition-colors">
                                View Details
                              </p>
                              <p className="text-xs text-slate-600 mt-1">See full loan info</p>
                            </button>
                            <button
                              onClick={() => {
                                // Handle request late payment
                                alert('Late payment request functionality coming soon');
                              }}
                              className="bg-[#6EE8B5] rounded-xl p-4 text-left hover:opacity-90 transition-opacity cursor-pointer group"
                            >
                              <div className="w-10 h-10 rounded-full bg-[#DBFFEB] flex items-center justify-center mb-3">
                                <Clock className="w-5 h-5 text-slate-700" />
                              </div>
                              <p className="font-semibold text-slate-800 text-sm group-hover:text-[#00A86B] transition-colors">
                                Request Late Payment
                              </p>
                              <p className="text-xs text-slate-600 mt-1">Ask for extension</p>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      {showPaymentModal && selectedLoan && (
        <RecordPaymentModal
          loan={selectedLoan}
          onClose={() => setShowPaymentModal(false)}
          onPaymentComplete={handlePaymentComplete}
          isLender={false}
        />
      )}

      {showDetailsModal && selectedLoanDetails && (
        <LoanDetailsModal
          loan={selectedLoanDetails.loan}
          type="borrowed"
          isOpen={showDetailsModal}
          user={user}
          onCancel={() => handleCancelLoan(selectedLoanDetails.loan)}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLoanDetails(null);
          }}
        />
      )}

      {showSignModal && selectedOffer && (
        <BorrowerSignatureModal
          isOpen={showSignModal}
          onClose={() => {
            setShowSignModal(false);
            setSelectedOffer(null);
          }}
          onSign={(signature) => handleSignOffer(selectedOffer.id, signature)}
          loanDetails={selectedOffer}
          userFullName={user?.full_name || ''}
          lenderName={publicProfiles.find(p => p.user_id === selectedOffer.lender_id)?.full_name || 'Lender'}
        />
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this loan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Loan</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelLoan}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Loan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, isSameMonth, addMonths, subMonths, differenceInDays } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import RecordPaymentModal from "@/components/loans/RecordPaymentModal";

import RecentActivity from "../components/dashboard/RecentActivity";
import PendingLoanOffers from "../components/dashboard/PendingLoanOffers";

// Helper function to sync public profile, moved here to adhere to file structure rules
const syncPublicProfile = async (userData) => {
  if (!userData || !userData.id || !userData.username || !userData.full_name) {
    console.log("syncPublicProfile: Not enough data to sync.", userData);
    return;
  }
  try {
    const existingProfiles = await PublicProfile.filter({ user_id: { eq: userData.id } });
    const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent((userData.full_name || 'User').charAt(0))}&background=22c55e&color=fff&size=128`;
    const publicProfileData = {
      user_id: userData.id,
      username: userData.username,
      full_name: userData.full_name,
      profile_picture_url: userData.profile_picture_url || defaultAvatarUrl
    };
    if (existingProfiles && existingProfiles.length > 0) {
      const existing = existingProfiles[0];
      if (existing.username !== publicProfileData.username || existing.full_name !== publicProfileData.full_name || existing.profile_picture_url !== publicProfileData.profile_picture_url) {
        await PublicProfile.update(existing.id, publicProfileData);
      }
    } else {
      await PublicProfile.create(publicProfileData);
    }
  } catch (error) {
    console.error("Failed to sync public profile:", error);
  }
};

export default function Home() {
  const { user: authUser, userProfile, isLoadingAuth, navigateToLogin } = useAuth();
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [overviewType, setOverviewType] = useState('lending'); // 'lending' or 'borrowing'
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [quickPayAmount, setQuickPayAmount] = useState('');
  const [quickPayMethod, setQuickPayMethod] = useState('');
  const [quickPayLoanId, setQuickPayLoanId] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // Use profile from context
  const user = userProfile ? { ...userProfile, id: authUser?.id, email: authUser?.email } : null;

  const safeEntityCall = async (entityCall, fallback = []) => {
    try {
      const result = await entityCall();
      return Array.isArray(result) ? result : (result ? [result] : fallback);
    } catch (error) {
      console.error("Entity call failed:", error);
      return fallback;
    }
  };

  const loadData = async () => {
    if (!authUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Only fetch loan data - user profile comes from context
      const [allLoans, recentPayments, allProfiles] = await Promise.all([
        safeEntityCall(() => Loan.list('-created_at')),
        safeEntityCall(() => Payment.list('-created_at', 10)),
        safeEntityCall(() => PublicProfile.list()),
      ]);

      setLoans(allLoans);
      setPayments(recentPayments);
      setPublicProfiles(allProfiles);
      setDataLoaded(true);

      // Sync profile in background if we have user data
      if (userProfile) {
        syncPublicProfile({ ...userProfile, id: authUser.id });
      }
    } catch (error) {
      console.error("Data load error:", error);
      setLoans([]);
      setPayments([]);
      setPublicProfiles([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Only load data once when auth is ready and we haven't loaded yet
    if (!isLoadingAuth && !dataLoaded && authUser) {
      loadData();
    } else if (!isLoadingAuth && !authUser) {
      setIsLoading(false);
    }
  }, [isLoadingAuth]);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try {
      await navigateToLogin();
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      // Reset after a delay in case browser doesn't open
      setTimeout(() => setIsAuthenticating(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-96">
          <Card style={{backgroundColor: `rgb(var(--theme-card-bg))`, borderColor: `rgb(var(--theme-border))`}} className="backdrop-blur-sm p-8">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{borderColor: `rgb(var(--theme-primary))`}}></div>
              <p className="text-slate-600">Loading dashboard...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!user && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full"
        >
          <Card style={{backgroundColor: `rgb(var(--theme-card-bg))`, borderColor: `rgb(var(--theme-border))`}} className="backdrop-blur-sm shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden bg-white shadow-md">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e492d87a7_Logo.png" alt="Vony Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">
                Welcome to <span style={{color: `rgb(var(--theme-primary))`}}>Vony</span>
              </h1>
              <p className="mb-6 leading-relaxed" style={{ color: '#475569' }}>
                Lending money to friends made simple.
              </p>
              <Button
                onClick={handleLogin}
                disabled={isAuthenticating}
                className="w-full text-lg py-3 font-semibold shadow-lg text-white hover:opacity-90"
                style={{backgroundColor: '#00A86B'}}
                size="lg"
              >
                {isAuthenticating ? 'Signing you in...' : 'Sign In to Get Started'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (user) {
    const safeLoans = Array.isArray(loans) ? loans : [];
    const safeAllProfiles = Array.isArray(publicProfiles) ? publicProfiles : [];
    
    const myLoans = safeLoans.filter(loan => loan && (loan.lender_id === user.id || loan.borrower_id === user.id));
    const pendingOffers = safeLoans.filter(loan => loan && loan.borrower_id === user.id && loan.status === 'pending');

    const totalLent = myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active').reduce((sum, loan) => sum + (loan.amount || 0), 0);
    const totalBorrowed = myLoans.filter(l => l && l.borrower_id === user.id && l.status === 'active').reduce((sum, loan) => sum + (loan.amount || 0), 0);
    const activeLoanCount = myLoans.filter(l => l && l.status === 'active').length;
    
    const nextPayment = myLoans
      .filter(loan => loan && loan.borrower_id === user.id && loan.status === 'active' && loan.next_payment_date)
      .map(loan => ({ ...loan, date: new Date(loan.next_payment_date) }))
      .sort((a, b) => a.date - b.date)[0];

    // Calculate remaining payment amount after subtracting payments made in current period
    const getNextPaymentAmount = () => {
      if (!nextPayment) return 0;

      const safePayments = Array.isArray(payments) ? payments : [];
      const loanPayments = safePayments.filter(p => p && p.loan_id === nextPayment.id);

      // Determine the start of the current billing period based on payment frequency
      const now = new Date();
      const nextPaymentDate = new Date(nextPayment.next_payment_date);
      let periodStartDate = new Date(nextPaymentDate);

      // Calculate period start based on payment frequency
      const frequency = nextPayment.payment_frequency || 'monthly';
      if (frequency === 'weekly') {
        periodStartDate.setDate(periodStartDate.getDate() - 7);
      } else if (frequency === 'bi-weekly') {
        periodStartDate.setDate(periodStartDate.getDate() - 14);
      } else {
        // monthly - go back one month
        periodStartDate.setMonth(periodStartDate.getMonth() - 1);
      }

      // Sum payments made in the current billing period (completed payments only)
      const paymentsInPeriod = loanPayments.filter(p => {
        const paymentDate = new Date(p.payment_date || p.created_at);
        return paymentDate >= periodStartDate && paymentDate <= now && p.status === 'completed';
      });

      const paidThisPeriod = paymentsInPeriod.reduce((sum, p) => sum + (p.amount || 0), 0);
      const originalAmount = nextPayment.payment_amount || 0;
      const remainingAmount = Math.max(0, originalAmount - paidThisPeriod);

      return remainingAmount;
    };

    const nextPaymentAmount = getNextPaymentAmount();

    const getPaymentStatus = () => {
      if (!nextPayment) return 'None';
      const today = new Date();
      const paymentDate = new Date(nextPayment.date);
      const diffTime = paymentDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return 'Overdue';
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    };
    
    const paymentStatus = getPaymentStatus();

    // Compute lending/borrowing data for hero section
    const lentLoans = myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active');
    const totalLentAmount = lentLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
    const totalRepaid = lentLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
    const percentRepaid = totalLentAmount > 0 ? Math.round((totalRepaid / totalLentAmount) * 100) : 0;
    const totalLentRemaining = totalLentAmount - totalRepaid;

    const nextLenderPayment = myLoans
      .filter(loan => loan && loan.lender_id === user.id && loan.status === 'active' && loan.next_payment_date)
      .map(loan => {
        const otherUser = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
        return { ...loan, date: new Date(loan.next_payment_date), username: otherUser?.username || 'user' };
      })
      .sort((a, b) => a.date - b.date)[0];

    const borrowedLoans = myLoans.filter(l => l && l.borrower_id === user.id && l.status === 'active');
    const totalBorrowedAmount = borrowedLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
    const totalPaidBack = borrowedLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
    const percentPaid = totalBorrowedAmount > 0 ? Math.round((totalPaidBack / totalBorrowedAmount) * 100) : 0;
    const totalBorrowedRemaining = totalBorrowedAmount - totalPaidBack;

    const nextBorrowerPayment = myLoans
      .filter(loan => loan && loan.borrower_id === user.id && loan.status === 'active' && loan.next_payment_date)
      .map(loan => {
        const otherUser = safeAllProfiles.find(p => p.user_id === loan.lender_id);
        return { ...loan, date: new Date(loan.next_payment_date), username: otherUser?.username || 'user' };
      })
      .sort((a, b) => a.date - b.date)[0];

    // Bar chart max value
    const barChartMax = Math.max(totalLentAmount, totalBorrowedAmount, 1);

    return (
        <div className="min-h-screen" style={{backgroundColor: '#CDE7F8'}}>
          {/* Hero Section */}
          <div className="px-4 pt-8 pb-6 sm:px-8 md:px-24 md:pt-12 md:pb-6 lg:px-36" style={{backgroundColor: '#CDE7F8'}}>
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6 md:gap-8 w-full"
              >
                {/* Updates Box - Mobile: shows first, Desktop: hidden here (shown in right column) */}
                <div className="lg:hidden rounded-xl px-4 py-3 shadow-sm w-full flex items-center gap-3" style={{ backgroundColor: '#4C7FC4' }}>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-white tracking-tight font-sans flex-1">
                    {pendingOffers.length > 0
                      ? `You have ${pendingOffers.length} new update${pendingOffers.length !== 1 ? 's' : ''}`
                      : 'You have no new requests'
                    }
                  </p>
                  {pendingOffers.length > 0 && (
                    <Link
                      to={createPageUrl("Requests")}
                      className="flex-shrink-0 px-4 py-1.5 rounded-lg bg-white text-xs font-semibold text-[#213B75] hover:bg-white/90 transition-colors font-sans"
                    >
                      View Updates
                    </Link>
                  )}
                </div>

                {/* Greeting + Quick Action Circles on same row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                  <div>
                    {(() => {
                      const firstName = user.full_name?.split(' ')[0] || 'User';
                      return (
                        <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#213B75] tracking-tight leading-tight font-sans">Welcome Back, {firstName}</p>
                      );
                    })()}
                  </div>

                  {/* Quick Action Circles */}
                  <div className="flex items-start gap-5 sm:gap-6 flex-shrink-0">
                    <Link to={createPageUrl("Lending")} className="flex flex-col items-center gap-1.5 group">
                      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4C7FC4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <polyline points="5 12 12 5 19 12"></polyline>
                        </svg>
                      </div>
                      <p className="text-[10px] font-semibold text-[#213B75] text-center leading-tight font-sans">Make<br/>Lending Offer</p>
                    </Link>
                    <Link to={createPageUrl("Borrowing")} className="flex flex-col items-center gap-1.5 group">
                      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4C7FC4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="19" x2="12" y2="5"></line>
                          <polyline points="19 12 12 19 5 12"></polyline>
                        </svg>
                      </div>
                      <p className="text-[10px] font-semibold text-[#213B75] text-center leading-tight font-sans">Request<br/>to Borrow</p>
                    </Link>
                    <Link to={createPageUrl("LoanAgreements")} className="flex flex-col items-center gap-1.5 group">
                      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4C7FC4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                      </div>
                      <p className="text-[10px] font-semibold text-[#213B75] text-center leading-tight font-sans">View<br/>Documents</p>
                    </Link>
                  </div>
                </div>

                {/* Two-Column Layout: Left = Overviews stacked, Right = Updates + Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 w-full">
                  {/* Left Column: Lending Overview + Borrowing Overview stacked */}
                  <div className="flex flex-col gap-3 md:gap-4">
                    {/* Lending Overview Box */}
                    <div className="rounded-xl px-4 py-3 shadow-sm bg-white">
                      <p className="text-sm font-bold text-[#213B75] mb-2 tracking-tight font-sans">
                        Lending Overview
                      </p>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-[11px] font-medium text-[#4C7FC4]">Repaid</p>
                          <p className="text-[11px] font-bold text-[#213B75]">
                            {formatMoney(totalRepaid)} / {formatMoney(totalLentAmount)}
                          </p>
                        </div>
                        <div className="w-full h-5 bg-[#CDE7F8] rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                            style={{
                              width: `${Math.max((totalRepaid / Math.max(totalLentAmount, 1)) * 100, 2)}%`,
                              backgroundColor: '#4C7FC4'
                            }}
                          >
                            {totalRepaid > 0 && (
                              <span className="text-[10px] font-bold text-white">
                                {percentRepaid}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-[#CDE7F8] pt-2 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-[#4C7FC4] mb-0.5">Next Payment Date</p>
                          <div className="flex items-baseline gap-1.5">
                            <p className="text-base font-bold text-[#213B75]">
                              {nextLenderPayment ? format(nextLenderPayment.date, 'EEE, MMM d') : 'N/A'}
                            </p>
                            {nextLenderPayment && (
                              <p className="text-[11px] text-[#4C7FC4]">
                                {(() => {
                                  const days = Math.ceil((nextLenderPayment.date - new Date()) / (1000 * 60 * 60 * 24));
                                  return days > 0 ? `${days}d away` : days === 0 ? 'Due today' : `${Math.abs(days)}d overdue`;
                                })()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#4C7FC4] mb-0.5">Next Payment Amount</p>
                          <div className="flex items-baseline gap-1.5">
                            <p className="text-base font-bold text-[#213B75]">
                              {nextLenderPayment ? formatMoney(nextLenderPayment.payment_amount || 0) : 'N/A'}
                            </p>
                            {nextLenderPayment && (
                              <p className="text-[11px] text-[#4C7FC4]">
                                from @{nextLenderPayment.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Borrowing Overview Box */}
                    <div className="rounded-xl px-4 py-3 shadow-sm bg-white">
                      <p className="text-sm font-bold text-[#213B75] mb-2 tracking-tight font-sans">
                        Borrowing Overview
                      </p>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-[11px] font-medium text-[#4C7FC4]">Paid Back</p>
                          <p className="text-[11px] font-bold text-[#213B75]">
                            {formatMoney(totalPaidBack)} / {formatMoney(totalBorrowedAmount)}
                          </p>
                        </div>
                        <div className="w-full h-5 bg-[#CDE7F8] rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                            style={{
                              width: `${Math.max((totalPaidBack / Math.max(totalBorrowedAmount, 1)) * 100, 2)}%`,
                              backgroundColor: '#4C7FC4'
                            }}
                          >
                            {totalPaidBack > 0 && (
                              <span className="text-[10px] font-bold text-white">
                                {percentPaid}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-[#CDE7F8] pt-2 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-[#4C7FC4] mb-0.5">Next Payment Date</p>
                          <div className="flex items-baseline gap-1.5">
                            <p className="text-base font-bold text-[#213B75]">
                              {nextBorrowerPayment ? format(nextBorrowerPayment.date, 'EEE, MMM d') : 'N/A'}
                            </p>
                            {nextBorrowerPayment && (
                              <p className="text-[11px] text-[#4C7FC4]">
                                {(() => {
                                  const days = Math.ceil((nextBorrowerPayment.date - new Date()) / (1000 * 60 * 60 * 24));
                                  return days > 0 ? `${days}d away` : days === 0 ? 'Due today' : `${Math.abs(days)}d overdue`;
                                })()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#4C7FC4] mb-0.5">Next Payment Amount</p>
                          <div className="flex items-baseline gap-1.5">
                            <p className="text-base font-bold text-[#213B75]">
                              {nextBorrowerPayment ? formatMoney(nextBorrowerPayment.payment_amount || 0) : 'N/A'}
                            </p>
                            {nextBorrowerPayment && (
                              <p className="text-[11px] text-[#4C7FC4]">
                                to @{nextBorrowerPayment.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Record Payment Box */}
                    {myLoans.filter(l => l && l.status === 'active').length > 0 && (
                      <div className="rounded-xl px-4 py-3 shadow-sm" style={{ backgroundColor: '#4C7FC4' }}>
                        <p className="text-sm font-bold text-white mb-2 tracking-tight font-sans">
                          Record Payment
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-white">
                          <span>Record payment of</span>
                          <span className="font-medium">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder=""
                            value={quickPayAmount}
                            onChange={(e) => setQuickPayAmount(e.target.value)}
                            className="w-20 h-7 px-2 bg-white/20 border-0 text-xs inline-flex rounded-md text-white placeholder:text-white/50"
                            style={{ MozAppearance: 'textfield' }}
                          />
                          <span>via</span>
                          <Select value={quickPayMethod} onValueChange={setQuickPayMethod}>
                            <SelectTrigger className="w-auto h-7 px-2 bg-white/20 border-0 text-xs inline-flex rounded-md text-white">
                              <SelectValue placeholder="select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="venmo">Venmo</SelectItem>
                              <SelectItem value="zelle">Zelle</SelectItem>
                              <SelectItem value="cashapp">Cash App</SelectItem>
                              <SelectItem value="paypal">PayPal</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <span>for</span>
                          <Select value={quickPayLoanId} onValueChange={setQuickPayLoanId}>
                            <SelectTrigger className="w-auto h-7 px-2 bg-white/20 border-0 text-xs inline-flex min-w-[120px] rounded-md text-white">
                              <SelectValue placeholder="select loan" />
                            </SelectTrigger>
                            <SelectContent>
                              {myLoans.filter(l => l && l.status === 'active').map((loan) => {
                                const isLender = loan.lender_id === user.id;
                                const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
                                const otherUser = safeAllProfiles.find(p => p.user_id === otherUserId);
                                return (
                                  <SelectItem key={loan.id} value={loan.id}>
                                    @{otherUser?.username || 'user'} - {loan.purpose || `$${loan.amount}`}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            onClick={() => {
                              const loan = myLoans.find(l => l.id === quickPayLoanId);
                              if (loan) {
                                setSelectedLoan({
                                  ...loan,
                                  _prefillAmount: quickPayAmount,
                                  _prefillMethod: quickPayMethod,
                                });
                                setShowPaymentModal(true);
                              }
                            }}
                            disabled={!quickPayLoanId || !quickPayAmount}
                            className={`h-7 px-3 rounded-md text-xs font-semibold border-0 transition-all ${
                              !quickPayLoanId || !quickPayAmount
                                ? 'bg-white/30 text-white/70 cursor-not-allowed'
                                : 'bg-white text-[#4C7FC4] hover:bg-white/90'
                            }`}
                          >
                            Submit
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Updates + Monthly Overview */}
                  <div className="flex flex-col gap-3 md:gap-4">
                    {/* Updates Box - Desktop only (mobile version is at top) */}
                    <div className="hidden lg:flex rounded-xl px-4 py-3 shadow-sm items-center gap-3" style={{ backgroundColor: '#4C7FC4' }}>
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-white tracking-tight font-sans flex-1">
                        {pendingOffers.length > 0
                          ? `You have ${pendingOffers.length} new update${pendingOffers.length !== 1 ? 's' : ''}`
                          : 'You have no new requests'
                        }
                      </p>
                      {pendingOffers.length > 0 && (
                        <Link
                          to={createPageUrl("Requests")}
                          className="flex-shrink-0 px-4 py-1.5 rounded-lg bg-white text-xs font-semibold text-[#213B75] hover:bg-white/90 transition-colors font-sans"
                        >
                          View Updates
                        </Link>
                      )}
                    </div>

                    {/* Monthly Overview Box */}
                    <div className="rounded-xl px-4 py-3 shadow-sm bg-white">
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-sm font-bold text-[#213B75] tracking-tight font-sans">
                          {format(calendarMonth, 'MMMM')} Overview
                        </p>
                        <button
                          onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200 bg-[#CDE7F8] hover:bg-[#b8d9f0]"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#213B75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                          </svg>
                        </button>
                        <button
                          onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200 bg-[#CDE7F8] hover:bg-[#b8d9f0]"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#213B75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </button>
                      </div>

                      <div className="space-y-1.5 overflow-y-auto max-h-[320px] pr-1">
                        {(() => {
                          const monthStart = startOfMonth(calendarMonth);
                          const monthEnd = endOfMonth(calendarMonth);
                          const events = [];
                          const activeLoans = myLoans.filter(l => l && l.status === 'active');
                          const safePayments = Array.isArray(payments) ? payments : [];

                          activeLoans.forEach(loan => {
                            if (!loan.next_payment_date) return;

                            const paymentDate = new Date(loan.next_payment_date);
                            const isLender = loan.lender_id === user.id;
                            const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
                            const otherUser = safeAllProfiles.find(p => p.user_id === otherUserId);

                            const addEventIfInMonth = (date) => {
                              if (isSameMonth(date, calendarMonth)) {
                                // Check payment status for this date
                                const eventDate = new Date(date);
                                const loanPayments = safePayments.filter(p => p && p.loan_id === loan.id);

                                // Find if there's a completed or pending payment for this period
                                const matchingPayment = loanPayments.find(p => {
                                  const pDate = new Date(p.payment_date || p.created_at);
                                  const dayDiff = Math.abs(Math.ceil((pDate - eventDate) / (1000 * 60 * 60 * 24)));
                                  return dayDiff <= 7; // Within a week of the expected date
                                });

                                let paymentStatus = 'none'; // no payment recorded
                                if (matchingPayment) {
                                  if (matchingPayment.status === 'completed') paymentStatus = 'completed';
                                  else if (matchingPayment.status === 'pending') paymentStatus = 'pending';
                                  else paymentStatus = 'none';
                                }

                                events.push({
                                  date: new Date(date),
                                  type: isLender ? 'receive' : 'send',
                                  amount: loan.payment_amount || 0,
                                  username: otherUser?.username || 'user',
                                  loanId: loan.id,
                                  loan: loan,
                                  paymentStatus: paymentStatus
                                });
                              }
                            };

                            addEventIfInMonth(paymentDate);

                            const frequency = loan.payment_frequency;
                            if (frequency && frequency !== 'none') {
                              let currentDate = new Date(loan.next_payment_date);
                              const maxIterations = 10;
                              let iterations = 0;

                              while (iterations < maxIterations) {
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
                              <div className="flex flex-col items-center justify-center py-8 text-[#4C7FC4]">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 mb-2">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                  <line x1="16" y1="2" x2="16" y2="6"></line>
                                  <line x1="8" y1="2" x2="8" y2="6"></line>
                                  <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <p className="text-sm">No payments this month</p>
                              </div>
                            );
                          }

                          return events.map((event, index) => {
                            const daysUntil = differenceInDays(event.date, new Date());
                            let dueText = '';
                            if (daysUntil > 0) dueText = `due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
                            else if (daysUntil === 0) dueText = 'due today';
                            else dueText = `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue`;

                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#CDE7F8]"
                              >
                                <div className="bg-white rounded-md px-2 py-1.5 flex-shrink-0 text-center min-w-[48px]">
                                  <p className="text-xs font-bold text-[#213B75] whitespace-nowrap">
                                    {format(event.date, 'MMM d')}
                                  </p>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-[#213B75]">
                                    {event.type === 'send'
                                      ? <>Send payment of <span className="font-bold">${event.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></>
                                      : <>Due to receive payment of <span className="font-bold">${event.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></>
                                    }
                                  </p>
                                  <p className="text-[11px] text-[#4C7FC4]">
                                    Payment {event.type === 'send' ? 'to' : 'from'} @{event.username} {dueText}
                                  </p>
                                </div>

                                <div className="flex-shrink-0">
                                  {event.paymentStatus === 'completed' ? (
                                    <span className="px-2.5 py-1 rounded-md bg-[#00A86B] text-[10px] font-semibold text-white whitespace-nowrap">
                                      Payment Complete
                                    </span>
                                  ) : event.paymentStatus === 'pending' ? (
                                    <span className="px-2.5 py-1 rounded-md bg-[#F59E0B] text-[10px] font-semibold text-white whitespace-nowrap">
                                      Pending Confirmation
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedLoan(event.loan);
                                        setShowPaymentModal(true);
                                      }}
                                      className="px-2.5 py-1 rounded-md bg-[#4C7FC4] text-[10px] font-semibold text-white hover:bg-[#3a6bb0] transition-colors whitespace-nowrap"
                                    >
                                      Record Payment
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                    </div>

                    {/* Month Balance - outside overview box, darker blue */}
                    {(() => {
                      const monthEnd = endOfMonth(calendarMonth);
                      const activeLoansForBalance = myLoans.filter(l => l && l.status === 'active');
                      let totalReceive = 0;
                      let totalSend = 0;

                      activeLoansForBalance.forEach(loan => {
                        if (!loan.next_payment_date) return;
                        const paymentDate = new Date(loan.next_payment_date);
                        const isLender = loan.lender_id === user.id;
                        const paymentAmount = loan.payment_amount || 0;

                        const addAmountIfInMonth = (date) => {
                          if (isSameMonth(date, calendarMonth)) {
                            if (isLender) totalReceive += paymentAmount;
                            else totalSend += paymentAmount;
                          }
                        };

                        addAmountIfInMonth(paymentDate);

                        const frequency = loan.payment_frequency;
                        if (frequency && frequency !== 'none') {
                          let currentDate = new Date(loan.next_payment_date);
                          let iterations = 0;
                          while (iterations < 10) {
                            if (frequency === 'weekly') currentDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
                            else if (frequency === 'biweekly') currentDate = new Date(currentDate.setDate(currentDate.getDate() + 14));
                            else if (frequency === 'monthly') currentDate = addMonths(currentDate, 1);
                            else if (frequency === 'daily') currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
                            else break;
                            if (currentDate > monthEnd) break;
                            addAmountIfInMonth(currentDate);
                            iterations++;
                          }
                        }
                      });

                      const netBalance = totalReceive - totalSend;
                      const isPositive = netBalance >= 0;

                      return (
                        <div className="rounded-xl px-4 py-2.5 flex items-center justify-between shadow-sm" style={{ backgroundColor: '#213B75' }}>
                          <p className="text-xs font-semibold text-white font-sans">
                            {format(calendarMonth, 'MMMM')} Balance
                          </p>
                          <p className="text-xs font-bold text-white font-sans">
                            {isPositive ? '+' : '-'}${Math.abs(netBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </motion.div>

            </div>
          </div>

          {/* Main Content Below Hero */}
          <div className="px-4 pt-4 pb-8 sm:px-8 md:px-24 md:pt-4 md:pb-10 lg:px-36" style={{backgroundColor: '#CDE7F8'}}>
           <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 md:space-y-10" style={{backgroundColor: '#1C4332'}}>

            {pendingOffers.length > 0 && (
              <PendingLoanOffers offers={pendingOffers} />
            )}

            {/* Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Card className="border-0 rounded-lg overflow-hidden" style={{backgroundColor: '#C2FFDC'}}>
                  <CardContent className="p-4 md:p-5">
                    <p className="text-base font-bold text-slate-800 tracking-tight font-sans mb-3">
                      Activity
                    </p>
                    <RecentActivity loans={myLoans} payments={payments} user={user} allUsers={safeAllProfiles} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
            </div>

          </div>

          {/* Record Payment Modal */}
          {showPaymentModal && selectedLoan && (
            <RecordPaymentModal
              loan={selectedLoan}
              onClose={() => {
                setShowPaymentModal(false);
                setSelectedLoan(null);
                setQuickPayAmount('');
                setQuickPayMethod('');
                setQuickPayLoanId('');
              }}
              onPaymentComplete={() => {
                setShowPaymentModal(false);
                setSelectedLoan(null);
                setQuickPayAmount('');
                setQuickPayMethod('');
                setQuickPayLoanId('');
                loadData();
              }}
              isLender={selectedLoan.lender_id === user.id}
            />
          )}
          </div>
    );
    }

  return (
    <div className="min-h-screen p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-96">
        <Card style={{backgroundColor: `rgb(var(--theme-card-bg))`, borderColor: `rgb(var(--theme-border))`}} className="backdrop-blur-sm p-8">
          <div className="text-center">
            <p className="text-slate-600">Loading...</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

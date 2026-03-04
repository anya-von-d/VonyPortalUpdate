import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import RecordPaymentModal from "@/components/loans/RecordPaymentModal";

import StatsCard from "../components/dashboard/StatsCard";
import RecentActivity from "../components/dashboard/RecentActivity";
import PendingLoanOffers from "../components/dashboard/PendingLoanOffers";
import LoanProgress from "../components/dashboard/LoanProgress";

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
  const [friendships, setFriendships] = useState([]);
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
      const [allLoans, recentPayments, allProfiles, allFriendships] = await Promise.all([
        safeEntityCall(() => Loan.list('-created_at')),
        safeEntityCall(() => Payment.list('-created_at', 10)),
        safeEntityCall(() => PublicProfile.list()),
        safeEntityCall(() => Friendship.list()),
      ]);

      setLoans(allLoans);
      setPayments(recentPayments);
      setPublicProfiles(allProfiles);
      setFriendships(allFriendships);
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
        <div className="min-h-screen" style={{backgroundColor: '#F4F7F5'}}>
          {/* Hero Section */}
          <div className="px-12 py-8 md:px-24 md:py-12 lg:px-36" style={{backgroundColor: '#83F384'}}>
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 md:gap-10"
              >
                {/* Left Side - Greeting on 3 lines */}
                <div className="flex-shrink-0">
                  {(() => {
                    const hour = new Date().getHours();
                    const greeting = hour < 12 ? "Good Morning," : hour < 18 ? "Good Afternoon," : "Good Evening,";
                    const firstName = user.full_name?.split(' ')[0] || 'User';
                    return (
                      <div>
                        <p className="text-3xl md:text-4xl font-bold text-[#1C4332] tracking-tight leading-tight font-serif">{greeting}</p>
                        <p className="text-3xl md:text-4xl font-bold text-[#1C4332] tracking-tight leading-tight font-serif">{firstName}</p>
                      </div>
                    );
                  })()}
                </div>

                {/* Right Side - Overview box with arrows */}
                <div className="rounded-xl p-5 md:p-7 flex-1 lg:max-w-md shadow-sm relative overflow-hidden" style={{backgroundColor: '#DBFFEB'}}>
                  {/* Left Arrow */}
                  <button
                    onClick={() => setOverviewType(overviewType === 'lending' ? 'borrowing' : 'lending')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200 bg-[#E2F5EA] hover:bg-[#c8e6d0]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>

                  {/* Right Arrow */}
                  <button
                    onClick={() => setOverviewType(overviewType === 'lending' ? 'borrowing' : 'lending')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200 bg-[#E2F5EA] hover:bg-[#c8e6d0]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>

                  <motion.div
                    key={overviewType}
                    initial={{ opacity: 0, x: overviewType === 'lending' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="px-6"
                  >
                    <p className="text-lg font-bold text-slate-800 mb-5 tracking-tight font-serif">
                      {overviewType === 'lending' ? 'Lending Overview' : 'Borrowing Overview'}
                    </p>

                    {/* Bar Chart */}
                    <div className="space-y-3 mb-6">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-slate-500">
                            {overviewType === 'lending' ? 'Repaid' : 'Paid Back'}
                          </p>
                          <p className="text-xs font-bold text-[#00A86B]">
                            {formatMoney(overviewType === 'lending' ? totalRepaid : totalPaidBack)} / {formatMoney(overviewType === 'lending' ? totalLentAmount : totalBorrowedAmount)}
                          </p>
                        </div>
                        <div className="w-full h-6 bg-[#E2F5EA] rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                            style={{
                              width: `${Math.max(((overviewType === 'lending' ? totalRepaid : totalPaidBack) / Math.max(overviewType === 'lending' ? totalLentAmount : totalBorrowedAmount, 1)) * 100, 2)}%`,
                              backgroundColor: '#00A86B'
                            }}
                          >
                            {(overviewType === 'lending' ? totalRepaid : totalPaidBack) > 0 && (
                              <span className="text-[10px] font-bold text-white">
                                {overviewType === 'lending' ? percentRepaid : percentPaid}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Next Payment Info */}
                    <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Next Payment Date</p>
                        <p className="text-sm font-bold text-slate-800">
                          {overviewType === 'lending'
                            ? (nextLenderPayment ? format(nextLenderPayment.date, 'EEE, MMM d') : 'N/A')
                            : (nextBorrowerPayment ? format(nextBorrowerPayment.date, 'EEE, MMM d') : 'N/A')
                          }
                        </p>
                        {((overviewType === 'lending' && nextLenderPayment) || (overviewType === 'borrowing' && nextBorrowerPayment)) && (
                          <p className="text-xs text-[#00A86B] mt-0.5">
                            {(() => {
                              const payment = overviewType === 'lending' ? nextLenderPayment : nextBorrowerPayment;
                              const days = Math.ceil((payment.date - new Date()) / (1000 * 60 * 60 * 24));
                              return days > 0 ? `${days} day${days !== 1 ? 's' : ''} away` : days === 0 ? 'Due today' : `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
                            })()}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Next Payment Amount</p>
                        <p className="text-sm font-bold text-slate-800">
                          {overviewType === 'lending'
                            ? (nextLenderPayment ? formatMoney(nextLenderPayment.payment_amount || 0) : 'N/A')
                            : (nextBorrowerPayment ? formatMoney(nextBorrowerPayment.payment_amount || 0) : 'N/A')
                          }
                        </p>
                        {((overviewType === 'lending' && nextLenderPayment) || (overviewType === 'borrowing' && nextBorrowerPayment)) && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {overviewType === 'lending' ? `from @${nextLenderPayment.username}` : `to @${nextBorrowerPayment.username}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>

              </motion.div>

            </div>
          </div>

          {/* Main Content Below Hero */}
          <div className="px-12 pt-10 pb-8 md:px-24 md:pt-14 md:pb-10 lg:px-36" style={{backgroundColor: '#1C4332'}}>
           <div className="max-w-6xl mx-auto space-y-8 md:space-y-10">

            {pendingOffers.length > 0 && (
              <PendingLoanOffers offers={pendingOffers} />
            )}

            {/* Quick Actions & Activity Row */}
            <div className="grid lg:grid-cols-[auto_1fr] gap-4 md:gap-6 items-center">
              {/* Stacked Quick Action Buttons */}
              <div className="flex flex-col gap-2 items-stretch w-[180px] mx-auto lg:mx-0">
                <Link
                  to={createPageUrl("Lending")}
                  className="py-2.5 rounded-full text-sm font-semibold text-[#1C4332] text-center transition-colors duration-200 hover:opacity-90 whitespace-nowrap"
                  style={{ backgroundColor: '#83F384' }}
                >
                  Create Loan Offer
                </Link>
                <Link
                  to={createPageUrl("Requests")}
                  className="py-2.5 rounded-full text-sm font-semibold text-[#1C4332] text-center transition-colors duration-200 hover:opacity-90 whitespace-nowrap"
                  style={{ backgroundColor: '#83F384' }}
                >
                  View Requests
                </Link>
                <Link
                  to={createPageUrl("LoanAgreements")}
                  className="py-2.5 rounded-full text-sm font-semibold text-[#1C4332] text-center transition-colors duration-200 hover:opacity-90 whitespace-nowrap"
                  style={{ backgroundColor: '#83F384' }}
                >
                  View Documents
                </Link>
              </div>

              {/* Activity */}
              <div>
                <RecentActivity loans={myLoans} payments={payments} user={user} allUsers={safeAllProfiles} />
              </div>
            </div>

            {/* Record Payment Box */}
            {myLoans.filter(l => l && l.status === 'active').length > 0 && (
              <div className="rounded-2xl p-5 border-0" style={{backgroundColor: '#83F384'}}>
                <p className="text-[11px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  Record Payment
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <span>Record payment of</span>
                  <span className="font-medium">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder=""
                    value={quickPayAmount}
                    onChange={(e) => setQuickPayAmount(e.target.value)}
                    className="w-24 h-8 px-3 bg-white inline-flex"
                    style={{ MozAppearance: 'textfield' }}
                  />
                  <span>via</span>
                  <Select value={quickPayMethod} onValueChange={setQuickPayMethod}>
                    <SelectTrigger className="w-auto h-8 px-3 bg-white inline-flex">
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
                    <SelectTrigger className="w-auto h-8 px-3 bg-white inline-flex min-w-[140px]">
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
                    className={`h-8 px-4 rounded-lg text-sm font-medium border-0 transition-all ${
                      !quickPayLoanId || !quickPayAmount
                        ? 'bg-[#00A86B]/50 text-white/70 cursor-not-allowed'
                        : 'bg-[#00A86B] text-white hover:bg-[#0D9B76]'
                    }`}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            )}

            {/* Your Friends & Monthly Overview Row */}
            <div className="grid lg:grid-cols-[2fr_1fr] gap-4 md:gap-6 items-start">
              {/* Your Friends */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <Card className="border-0 rounded-lg overflow-hidden" style={{backgroundColor: '#DBFFEB'}}>
                  <CardContent className="p-4 md:p-5">
                    <p className="text-xl font-bold text-slate-800 mb-4 tracking-tight font-serif">
                      Your Friends
                    </p>

                    <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1">
                      {(() => {
                        const acceptedFriends = friendships.filter(f =>
                          f.status === 'accepted' && (f.user_id === user.id || f.friend_id === user.id)
                        );

                        if (acceptedFriends.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 mb-2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <line x1="19" y1="8" x2="19" y2="14"></line>
                                <line x1="22" y1="11" x2="16" y2="11"></line>
                              </svg>
                              <p className="text-sm">No friends yet</p>
                            </div>
                          );
                        }

                        return acceptedFriends.map((friendship) => {
                          const friendUserId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id;
                          const friendProfile = safeAllProfiles.find(p => p.user_id === friendUserId);
                          const friendActiveLoans = myLoans.filter(l =>
                            l.status === 'active' && (
                              (l.lender_id === user.id && l.borrower_id === friendUserId) ||
                              (l.borrower_id === user.id && l.lender_id === friendUserId)
                            )
                          );

                          const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent((friendProfile?.full_name || 'U').charAt(0))}&background=22c55e&color=fff&size=128`;

                          return (
                            <div key={friendship.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ backgroundColor: '#83F384' }}>
                              {/* Profile Photo */}
                              <img
                                src={friendProfile?.profile_picture_url || defaultAvatar}
                                alt={friendProfile?.full_name || 'Friend'}
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0 bg-white"
                              />

                              {/* Name & Active Loans */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#0A1A10] truncate">
                                  {friendProfile?.full_name || friendProfile?.username || 'Friend'}
                                </p>
                                <div className="bg-white rounded-md px-2 py-0.5 inline-block mt-0.5">
                                  <p className="text-xs font-medium text-slate-600">
                                    {friendActiveLoans.length} active loan{friendActiveLoans.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>

                              {/* Lend & Borrow Buttons */}
                              <div className="flex gap-1.5 flex-shrink-0">
                                <Link
                                  to={createPageUrl("Lending")}
                                  className="px-3 py-1.5 rounded-md bg-white text-xs font-semibold text-[#1C4332] hover:bg-white/80 transition-colors whitespace-nowrap"
                                >
                                  Offer to Lend
                                </Link>
                                <Link
                                  to={createPageUrl("Borrowing")}
                                  className="px-3 py-1.5 rounded-md bg-white text-xs font-semibold text-[#1C4332] hover:bg-white/80 transition-colors whitespace-nowrap"
                                >
                                  Request to Borrow
                                </Link>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* View All Link */}
                    <Link
                      to={createPageUrl("Friends")}
                      className="block mt-4 text-center text-sm font-semibold text-[#00A86B] hover:text-[#0D9B76] transition-colors"
                    >
                      View All Friends →
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Monthly Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="flex flex-col gap-1.5"
              >
                <Card className="border-0 rounded-lg overflow-hidden" style={{backgroundColor: '#DBFFEB'}}>
                  <CardContent className="p-4 md:p-5 flex flex-col">
                    {/* Month Title with Arrows */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <button
                        onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200 bg-[#E2F5EA] hover:bg-[#c8e6d0]"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>
                      <p className="text-base font-bold text-slate-800 tracking-tight font-serif">
                        {format(calendarMonth, 'MMMM')} Overview
                      </p>
                      <button
                        onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200 bg-[#E2F5EA] hover:bg-[#c8e6d0]"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

                      activeLoans.forEach(loan => {
                        if (!loan.next_payment_date) return;

                        const paymentDate = new Date(loan.next_payment_date);
                        const isLender = loan.lender_id === user.id;
                        const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
                        const otherUser = safeAllProfiles.find(p => p.user_id === otherUserId);

                        const addEventIfInMonth = (date) => {
                          if (isSameMonth(date, calendarMonth)) {
                            events.push({
                              date: new Date(date),
                              type: isLender ? 'receive' : 'send',
                              amount: loan.payment_amount || 0,
                              username: otherUser?.username || 'user'
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
                          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 mb-2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <p className="text-sm">No payments scheduled this month</p>
                          </div>
                        );
                      }

                      return events.map((event, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2.5 p-2 md:p-2.5 rounded-md"
                          style={{ backgroundColor: '#83F384' }}
                        >
                          <div className="bg-white/50 rounded-md px-2.5 py-1.5 flex-shrink-0 text-center min-w-[44px]">
                            <p className="text-xs text-slate-500 uppercase" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                              {format(event.date, 'MMM')}
                            </p>
                            <p className="text-lg font-bold text-slate-800">
                              {format(event.date, 'd')}
                            </p>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              <span className={event.type === 'send' ? 'text-red-600' : 'text-[#00A86B]'}>
                                {event.type === 'send' ? 'Send' : 'Receive'}
                              </span>
                              {' '}
                              <span className="font-bold">${event.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              {' '}
                              <span className="text-slate-600">{event.type === 'send' ? 'to' : 'from'}</span>
                              {' '}
                              <span className="font-medium">@{event.username}</span>
                            </p>
                          </div>

                          <div className="flex-shrink-0">
                            {event.type === 'send' ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <polyline points="19 12 12 19 5 12"></polyline>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A86B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="19" x2="12" y2="5"></line>
                                <polyline points="5 12 12 5 19 12"></polyline>
                              </svg>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Month Balance Box */}
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
                  <div className="bg-[#83F384] rounded-md p-2.5 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#0A1A10]">
                      {format(calendarMonth, 'MMMM')} Balance
                    </p>
                    <p className="text-sm font-bold text-[#0A1A10]">
                      {isPositive ? '+' : '-'}${Math.abs(netBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              })()}
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

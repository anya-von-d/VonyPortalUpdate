import React, { useState, useEffect } from "react";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";

import StatsCard from "../components/dashboard/StatsCard";
import RecentActivity from "../components/dashboard/RecentActivity";
import QuickActions from "../components/dashboard/QuickActions";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [overviewType, setOverviewType] = useState('lending'); // 'lending' or 'borrowing'
  const [calendarMonth, setCalendarMonth] = useState(new Date());

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

    return (
        <div className="min-h-screen px-4 py-6 md:p-6" style={{backgroundColor: '#C8E6D0'}}>
           <div className="max-w-6xl mx-auto space-y-5 md:space-y-7">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-3 md:py-5">
              <h1 className="text-3xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-left">
                {(() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
                  return <>{greeting}, <span className="text-black">{user.full_name?.split(' ')[0] || 'User'}</span></>;
                })()}
              </h1>
          </motion.div>

          <div className="space-y-5 md:space-y-7">
            {pendingOffers.length > 0 && (
              <PendingLoanOffers offers={pendingOffers} />
            )}

            <div className="grid lg:grid-cols-[2fr_1fr_1fr] gap-4 md:gap-6 items-start">
            {(() => {
              // Compute data for both views
              const lentLoans = myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active');
              const totalLentAmount = lentLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
              const totalRepaid = lentLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
              const percentRepaid = totalLentAmount > 0 ? Math.round((totalRepaid / totalLentAmount) * 100) : 0;

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

              const nextBorrowerPayment = myLoans
                .filter(loan => loan && loan.borrower_id === user.id && loan.status === 'active' && loan.next_payment_date)
                .map(loan => {
                  const otherUser = safeAllProfiles.find(p => p.user_id === loan.lender_id);
                  return { ...loan, date: new Date(loan.next_payment_date), username: otherUser?.username || 'user' };
                })
                .sort((a, b) => a.date - b.date)[0];

              return (
                <div
                  className="lg:col-span-2 rounded-lg p-5 md:p-7 relative transition-all duration-300 overflow-hidden"
                  style={{
                    background: '#052e16'
                  }}
                >
                  {/* Left Arrow */}
                  <button
                    onClick={() => setOverviewType(overviewType === 'lending' ? 'borrowing' : 'lending')}
                    className="absolute left-1 md:left-[-12px] top-1/2 -translate-y-1/2 z-10 w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-colors duration-200"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#83F384" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>

                  {/* Right Arrow */}
                  <button
                    onClick={() => setOverviewType(overviewType === 'lending' ? 'borrowing' : 'lending')}
                    className="absolute right-1 md:right-[-12px] top-1/2 -translate-y-1/2 z-10 w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-colors duration-200"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#83F384" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>

                  <motion.div
                    key={overviewType}
                    initial={{ opacity: 0, x: overviewType === 'lending' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {overviewType === 'lending' ? (
                      /* ===== LENDING OVERVIEW — Dark green card ===== */
                      <>
                        <p className="text-lg md:text-xl font-bold mb-4 md:mb-5 text-white tracking-tight font-sans">
                          Lending Overview
                        </p>
                        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                          {/* Donut Ring */}
                          <div className="relative flex-shrink-0" style={{ width: 100, height: 100 }}>
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                              <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(131,243,132,0.2)" strokeWidth="10" />
                              <circle
                                cx="70" cy="70" r="58"
                                fill="none"
                                stroke="#83F384"
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 58}
                                strokeDashoffset={2 * Math.PI * 58 - (percentRepaid / 100) * 2 * Math.PI * 58}
                                className="transition-all duration-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-xl md:text-2xl font-bold text-white">{percentRepaid}%</span>
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 gap-3 md:gap-4 flex-1 w-full">
                            <div>
                              <p className="text-xs md:text-sm text-white/50 mb-1">Repayment</p>
                              <p className="text-base md:text-lg font-bold">
                                <span className="text-[#83F384]">{percentRepaid}%</span>
                                <span className="text-white/70 text-xs md:text-sm font-medium ml-1">REPAID</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-white/50 mb-1">Total Lent</p>
                              <p className="text-base md:text-lg font-bold text-white">
                                {formatMoney(totalRepaid)} <span className="text-white/40 text-xs md:text-sm font-normal">of {formatMoney(totalLentAmount)}</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-white/50 mb-1">Next Payment</p>
                              <p className="text-base md:text-lg font-bold text-white">
                                {nextLenderPayment ? formatMoney(nextLenderPayment.payment_amount || 0) : 'N/A'}
                              </p>
                              {nextLenderPayment && (
                                <p className="text-xs text-white/40 mt-0.5">from @{nextLenderPayment.username}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-white/50 mb-1">Next Payment Date</p>
                              <p className="text-base md:text-lg font-bold text-white">
                                {nextLenderPayment ? `${format(nextLenderPayment.date, 'EEE')}, ${format(nextLenderPayment.date, 'MMM d')}` : 'N/A'}
                              </p>
                              {nextLenderPayment && (
                                <p className="text-xs text-[#83F384] mt-0.5">
                                  {(() => {
                                    const days = Math.ceil((nextLenderPayment.date - new Date()) / (1000 * 60 * 60 * 24));
                                    return days > 0 ? `${days} day${days !== 1 ? 's' : ''} away` : days === 0 ? 'Due today' : `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
                                  })()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* ===== BORROWING OVERVIEW — Dark green card (same style as lending) ===== */
                      <>
                        <p className="text-lg md:text-xl font-bold mb-4 md:mb-5 text-white tracking-tight font-sans">
                          Borrowing Overview
                        </p>
                        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                          {/* Donut Ring */}
                          <div className="relative flex-shrink-0" style={{ width: 100, height: 100 }}>
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                              <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(131,243,132,0.2)" strokeWidth="10" />
                              <circle
                                cx="70" cy="70" r="58"
                                fill="none"
                                stroke="#83F384"
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 58}
                                strokeDashoffset={2 * Math.PI * 58 - (percentPaid / 100) * 2 * Math.PI * 58}
                                className="transition-all duration-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-xl md:text-2xl font-bold text-white">{percentPaid}%</span>
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 gap-3 md:gap-4 flex-1 w-full">
                            <div>
                              <p className="text-xs md:text-sm text-white/50 mb-1">Repayment</p>
                              <p className="text-base md:text-lg font-bold">
                                <span className="text-[#83F384]">{percentPaid}%</span>
                                <span className="text-white/70 text-xs md:text-sm font-medium ml-1">PAID</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-white/50 mb-1">Total Borrowed</p>
                              <p className="text-base md:text-lg font-bold text-white">
                                {formatMoney(totalPaidBack)} <span className="text-white/40 text-xs md:text-sm font-normal">of {formatMoney(totalBorrowedAmount)}</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-white/50 mb-1">Next Payment</p>
                              <p className="text-base md:text-lg font-bold text-white">
                                {nextBorrowerPayment ? formatMoney(nextBorrowerPayment.payment_amount || 0) : 'N/A'}
                              </p>
                              {nextBorrowerPayment && (
                                <p className="text-xs text-white/40 mt-0.5">to @{nextBorrowerPayment.username}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs md:text-sm text-white/50 mb-1">Next Payment Date</p>
                              <p className="text-base md:text-lg font-bold text-white">
                                {nextBorrowerPayment ? `${format(nextBorrowerPayment.date, 'EEE')}, ${format(nextBorrowerPayment.date, 'MMM d')}` : 'N/A'}
                              </p>
                              {nextBorrowerPayment && (
                                <p className="text-xs text-[#83F384] mt-0.5">
                                  {(() => {
                                    const days = Math.ceil((nextBorrowerPayment.date - new Date()) / (1000 * 60 * 60 * 24));
                                    return days > 0 ? `${days} day${days !== 1 ? 's' : ''} away` : days === 0 ? 'Due today' : `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
                                  })()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                </div>
              );
            })()}

            <div className="lg:col-span-1">
              <QuickActions />
            </div>
            </div>

            {/* Activity, Calendar & Monthly Overview Row */}
            <div className="grid lg:grid-cols-[2fr_1fr_1fr] gap-4 md:gap-6">
              {/* Activity */}
              <div>
                <RecentActivity loans={myLoans} payments={payments} user={user} allUsers={safeAllProfiles} />
              </div>

              {/* Calendar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Card className="border-0 rounded-lg overflow-hidden" style={{backgroundColor: '#EBF2EE'}}>
                  <CardContent className="p-4 md:p-5">
                    {/* Calendar Header with Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                        className="w-9 h-9 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center transition-colors duration-200"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A86B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>
                      <p className="text-xl font-bold text-slate-800 tracking-tight font-sans">
                        {format(calendarMonth, 'MMMM yyyy')}
                      </p>
                      <button
                        onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                        className="w-9 h-9 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center transition-colors duration-200"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A86B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </div>

                    {/* Day Labels */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    {(() => {
                      const monthStart = startOfMonth(calendarMonth);
                      const monthEnd = endOfMonth(calendarMonth);
                      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
                      const startDayOfWeek = getDay(monthStart);

                      // Get all payment events for this month
                      const getPaymentEvents = () => {
                        const events = [];
                        const activeLoans = myLoans.filter(l => l && l.status === 'active');

                        activeLoans.forEach(loan => {
                          if (!loan.next_payment_date) return;

                          const paymentDate = new Date(loan.next_payment_date);
                          const isLender = loan.lender_id === user.id;
                          const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
                          const otherUser = safeAllProfiles.find(p => p.user_id === otherUserId);

                          // Check if this payment falls in the current calendar month
                          if (isSameMonth(paymentDate, calendarMonth)) {
                            events.push({
                              date: paymentDate,
                              type: isLender ? 'receive' : 'send',
                              amount: loan.payment_amount || 0,
                              username: otherUser?.username || 'user'
                            });
                          }

                          // Also check for recurring payments within the month
                          const frequency = loan.payment_frequency;
                          if (frequency && frequency !== 'none') {
                            let currentDate = new Date(loan.next_payment_date);
                            const maxIterations = 10;
                            let iterations = 0;

                            while (iterations < maxIterations) {
                              // Move to next payment date based on frequency
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

                              // Stop if we've gone past the calendar month
                              if (currentDate > monthEnd) break;

                              // Add if this payment is in the calendar month
                              if (isSameMonth(currentDate, calendarMonth)) {
                                events.push({
                                  date: new Date(currentDate),
                                  type: isLender ? 'receive' : 'send',
                                  amount: loan.payment_amount || 0,
                                  username: otherUser?.username || 'user'
                                });
                              }

                              iterations++;
                            }
                          }
                        });

                        return events;
                      };

                      const paymentEvents = getPaymentEvents();

                      // Create empty cells for days before the first day of the month
                      const emptyCells = Array(startDayOfWeek).fill(null);

                      return (
                        <div className="grid grid-cols-7 gap-1">
                          {emptyCells.map((_, index) => (
                            <div key={`empty-${index}`} className="h-10" />
                          ))}
                          {daysInMonth.map(day => {
                            const dayEvents = paymentEvents.filter(e => isSameDay(e.date, day));
                            const hasSend = dayEvents.some(e => e.type === 'send');
                            const hasReceive = dayEvents.some(e => e.type === 'receive');
                            const isToday = isSameDay(day, new Date());

                            return (
                              <div
                                key={day.toISOString()}
                                className={`h-10 flex flex-col items-center justify-center rounded-lg relative ${
                                  isToday ? 'bg-white ring-2 ring-[#00A86B]' : ''
                                }`}
                              >
                                <span className={`text-sm ${isToday ? 'font-bold text-[#00A86B]' : 'text-slate-700'}`}>
                                  {format(day, 'd')}
                                </span>
                                {/* Payment Indicators */}
                                <div className="flex gap-0.5 absolute bottom-0.5">
                                  {hasSend && (
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#35B276' }} />
                                  )}
                                  {hasReceive && (
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#74FF71' }} />
                                  )}
                                </div>
                                {(hasSend || hasReceive) && (
                                  <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: hasSend && hasReceive ? '#6EE8A2' : hasSend ? '#35B276' : '#74FF71', opacity: 0.3, zIndex: -1 }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-white/50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#35B276' }} />
                        <span className="text-sm font-medium text-slate-700">Send</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#74FF71' }} />
                        <span className="text-sm font-medium text-slate-700">Receive</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6EE8A2' }} />
                        <span className="text-sm font-medium text-slate-700">Both</span>
                      </div>
                    </div>
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
                <Card className="border-0 rounded-lg overflow-hidden" style={{backgroundColor: '#EBF2EE'}}>
                  <CardContent className="p-4 md:p-5 flex flex-col">
                    <p className="text-xl font-bold text-slate-800 mb-4 tracking-tight font-sans">
                      {format(calendarMonth, 'MMMM')} Overview
                    </p>

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

                          // Helper to add event if in month
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

                          // Add recurring payments
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

                        // Sort by date
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

                        const colors = ['#83F384', '#83F384', '#83F384', '#83F384', '#83F384', '#83F384'];

                        return events.map((event, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2.5 p-2 md:p-2.5 rounded-md"
                            style={{ backgroundColor: colors[index % 6] }}
                          >
                            {/* Date Box */}
                            <div className="bg-white/50 rounded-md px-2.5 py-1.5 flex-shrink-0 text-center min-w-[44px]">
                              <p className="text-xs text-slate-500 uppercase" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                                {format(event.date, 'MMM')}
                              </p>
                              <p className="text-lg font-bold text-slate-800">
                                {format(event.date, 'd')}
                              </p>
                            </div>

                            {/* Event Details */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800">
                                <span className={event.type === 'send' ? 'text-red-600' : 'text-[#00A86B]'}>
                                  {event.type === 'send' ? 'Send' : 'Receive'}
                                </span>
                                {' '}
                                <span className="font-bold">${event.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                {' '}
                                <span className="text-slate-600">
                                  {event.type === 'send' ? 'to' : 'from'}
                                </span>
                                {' '}
                                <span className="font-medium">@{event.username}</span>
                              </p>
                            </div>

                            {/* Arrow indicator */}
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
                  const activeLoans = myLoans.filter(l => l && l.status === 'active');
                  let totalReceive = 0;
                  let totalSend = 0;

                  activeLoans.forEach(loan => {
                    if (!loan.next_payment_date) return;
                    const paymentDate = new Date(loan.next_payment_date);
                    const isLender = loan.lender_id === user.id;
                    const paymentAmount = loan.payment_amount || 0;

                    const addAmountIfInMonth = (date) => {
                      if (isSameMonth(date, calendarMonth)) {
                        if (isLender) {
                          totalReceive += paymentAmount;
                        } else {
                          totalSend += paymentAmount;
                        }
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

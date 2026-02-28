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
import PendingPaymentConfirmations from "../components/dashboard/PendingPaymentConfirmations";
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
        <div className="min-h-screen p-6"  style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
           <div className="max-w-4xl mx-auto space-y-7">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-5">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-center">
                {(() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
                  const emoji = hour < 12 ? "☀️" : hour < 18 ? "✨" : "🌙";
                  return <>{greeting}, <span style={{color: '#83F384'}}>{user.full_name?.split(' ')[0] || 'User'}</span> {emoji}</>;
                })()}
              </h1>
              <p className="text-lg text-center" style={{ color: '#475569' }}>
                Lending between friends made simple.
              </p>
          </motion.div>

          <div className="space-y-7">
            <PendingPaymentConfirmations userId={user.id} onUpdate={loadData} />

            {pendingOffers.length > 0 && (
              <PendingLoanOffers offers={pendingOffers} />
            )}

            <div className="bg-[#DBFFEB] rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pie Chart Card with Carousel */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="relative"
                >
                  {/* Left Arrow */}
                  <button
                    onClick={() => setOverviewType(overviewType === 'lending' ? 'borrowing' : 'lending')}
                    className="absolute left-[-12px] top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A86B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>

                  {/* Right Arrow */}
                  <button
                    onClick={() => setOverviewType(overviewType === 'lending' ? 'borrowing' : 'lending')}
                    className="absolute right-[-12px] top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A86B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>

                  <Card className="bg-white backdrop-blur-sm h-full cursor-default border-0 overflow-hidden">
                    <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                      <motion.div
                        key={overviewType}
                        initial={{ opacity: 0, x: overviewType === 'lending' ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: overviewType === 'lending' ? 20 : -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex flex-col items-center"
                      >
                        <p className="text-sm font-medium text-slate-600 mb-3">
                          {overviewType === 'lending' ? 'Lending Overview' : 'Borrowing Overview'}
                        </p>
                        {(() => {
                          if (overviewType === 'lending') {
                            const lentLoans = myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active');
                            const totalLentAmount = lentLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
                            const totalRepaid = lentLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
                            const percentRepaid = totalLentAmount > 0 ? Math.round((totalRepaid / totalLentAmount) * 100) : 0;
                            const circumference = 2 * Math.PI * 40;
                            const strokeDashoffset = circumference - (percentRepaid / 100) * circumference;

                            return (
                              <>
                                <div className="relative w-24 h-24">
                                  <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                                    <circle
                                      cx="48"
                                      cy="48"
                                      r="40"
                                      fill="none"
                                      stroke="#00A86B"
                                      strokeWidth="8"
                                      strokeLinecap="round"
                                      strokeDasharray={circumference}
                                      strokeDashoffset={strokeDashoffset}
                                      className="transition-all duration-500"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-lg font-bold text-slate-800">{percentRepaid}%</span>
                                    <span className="text-[10px] text-slate-500">Repaid</span>
                                  </div>
                                </div>
                                <div className="mt-3 text-center">
                                  <p className="text-xs text-slate-500">
                                    {formatMoney(totalRepaid)} of {formatMoney(totalLentAmount)}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {lentLoans.length} active loan{lentLoans.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </>
                            );
                          } else {
                            // Borrowing Overview
                            const borrowedLoans = myLoans.filter(l => l && l.borrower_id === user.id && l.status === 'active');
                            const totalBorrowedAmount = borrowedLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
                            const totalPaidBack = borrowedLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
                            const percentPaid = totalBorrowedAmount > 0 ? Math.round((totalPaidBack / totalBorrowedAmount) * 100) : 0;
                            const circumference = 2 * Math.PI * 40;
                            const strokeDashoffset = circumference - (percentPaid / 100) * circumference;

                            return (
                              <>
                                <div className="relative w-24 h-24">
                                  <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                                    <circle
                                      cx="48"
                                      cy="48"
                                      r="40"
                                      fill="none"
                                      stroke="#3B82F6"
                                      strokeWidth="8"
                                      strokeLinecap="round"
                                      strokeDasharray={circumference}
                                      strokeDashoffset={strokeDashoffset}
                                      className="transition-all duration-500"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-lg font-bold text-slate-800">{percentPaid}%</span>
                                    <span className="text-[10px] text-slate-500">Paid</span>
                                  </div>
                                </div>
                                <div className="mt-3 text-center">
                                  <p className="text-xs text-slate-500">
                                    {formatMoney(totalPaidBack)} of {formatMoney(totalBorrowedAmount)}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {borrowedLoans.length} active loan{borrowedLoans.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </>
                            );
                          }
                        })()}
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
                <StatsCard title="Next Payment" value={nextPayment ? formatMoney(nextPaymentAmount) : '-'} color="blue" change={nextPayment ? `to @${safeAllProfiles.find(p => p.user_id === nextPayment.lender_id)?.username || 'user'}` : 'N/A'} index={1} />
                <StatsCard title="Next Payment Due" value={paymentStatus} color="orange" change={nextPayment ? format(nextPayment.date, 'MMM d, yyyy') : 'N/A'} index={2} />
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <QuickActions />
              </div>
              <div className="lg:col-span-2">
                <RecentActivity loans={myLoans} payments={payments} user={user} allUsers={safeAllProfiles} /* Pass profiles */ />
              </div>
            </div>

            {/* Calendar and Monthly Overview Section */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Calendar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Card className="bg-[#DBFFEB] border-0 rounded-2xl overflow-hidden">
                  <CardContent className="p-5">
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
                      <h3 className="text-lg font-bold text-slate-800">
                        {format(calendarMonth, 'MMMM yyyy')}
                      </h3>
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
                                <div className="flex gap-0.5 absolute bottom-1">
                                  {hasSend && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#EF4444" stroke="none">
                                      <path d="M12 4 L4 14 L12 11 L20 14 Z" />
                                    </svg>
                                  )}
                                  {hasReceive && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#00A86B" stroke="none">
                                      <path d="M12 20 L4 10 L12 13 L20 10 Z" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-white/50">
                      <div className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#EF4444" stroke="none">
                          <path d="M12 4 L4 14 L12 11 L20 14 Z" />
                        </svg>
                        <span className="text-xs text-slate-600">Send</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#00A86B" stroke="none">
                          <path d="M12 20 L4 10 L12 13 L20 10 Z" />
                        </svg>
                        <span className="text-xs text-slate-600">Receive</span>
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
              >
                <Card className="bg-[#DBFFEB] border-0 rounded-2xl overflow-hidden h-full">
                  <CardContent className="p-5 h-full flex flex-col">
                    <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                      Monthly Overview
                    </p>

                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[320px] pr-1" style={{
                      maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
                    }}>
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

                        const colors = ['#D0ED6F', '#83F384', '#6EE8B5'];

                        return events.map((event, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ backgroundColor: colors[index % 3] }}
                          >
                            {/* Date Box */}
                            <div className="bg-[#DBFFEB] rounded-lg px-3 py-2 flex-shrink-0 text-center min-w-[50px]">
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

import React, { useState, useEffect } from "react";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { format } from "date-fns";
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
                  return <>{greeting}, <span style={{color: `rgb(var(--theme-primary))`}}>{user.full_name?.split(' ')[0] || 'User'}</span> {emoji}</>;
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
                {/* Pie Chart Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Card className="bg-white backdrop-blur-sm h-full cursor-default border-0">
                    <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                      <p className="text-sm font-medium text-slate-600 mb-3">Lending Overview</p>
                      {(() => {
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
                                {/* Background circle */}
                                <circle
                                  cx="48"
                                  cy="48"
                                  r="40"
                                  fill="none"
                                  stroke="#e2e8f0"
                                  strokeWidth="8"
                                />
                                {/* Progress circle */}
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
                      })()}
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

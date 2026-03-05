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
import { format, startOfMonth, endOfMonth, addMonths, addDays, isBefore, isAfter, differenceInDays } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import RecordPaymentModal from "@/components/loans/RecordPaymentModal";
import { AnimatePresence } from "framer-motion";


// Loan Carousel component for bottom section
function LoanCarousel({ hasLendingLoans, hasBorrowingLoans }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 2;

  // Auto-flip through slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % totalSlides);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (direction) => {
    if (direction === 'next') {
      setCurrentSlide(prev => (prev + 1) % totalSlides);
    } else {
      setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);
    }
  };

  const slides = [
    // Slide 1: Track loan progress
    <div key="progress" className="text-center px-4">
      <p className="text-lg sm:text-xl font-bold text-[#1C4332] font-sans mb-1.5 tracking-tight">
        Stay on top of your loans
      </p>
      <p className="text-sm text-[#1C4332]/60 font-sans mb-6 whitespace-nowrap">
        Check in on your payment progress and keep track of upcoming due dates
      </p>
      <div className="flex items-center justify-center gap-3">
        {hasBorrowingLoans && (
          <Link
            to={createPageUrl("Borrowing")}
            className="px-5 py-2.5 rounded-xl bg-[#1C4332] text-sm font-semibold text-[#6AD478] hover:bg-[#1C4332]/90 transition-colors font-sans"
          >
            Track Payment Progress
          </Link>
        )}
        {hasLendingLoans && (
          <Link
            to={createPageUrl("Lending")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans ${
              hasBorrowingLoans
                ? 'bg-[#1C4332]/15 text-[#1C4332] hover:bg-[#1C4332]/25'
                : 'bg-[#1C4332] text-[#6AD478] hover:bg-[#1C4332]/90'
            }`}
          >
            Track Repayment Progress
          </Link>
        )}
      </div>
    </div>,
    // Slide 2: View agreements
    <div key="agreements" className="text-center px-4">
      <p className="text-lg sm:text-xl font-bold text-[#1C4332] font-sans mb-1.5 tracking-tight">
        Review your loan agreements
      </p>
      <p className="text-sm text-[#1C4332]/60 font-sans mb-6 whitespace-nowrap">
        View and download your loan documents anytime to stay informed
      </p>
      <Link
        to={createPageUrl("LoanAgreements")}
        className="inline-block px-5 py-2.5 rounded-xl bg-[#1C4332] text-sm font-semibold text-[#6AD478] hover:bg-[#1C4332]/90 transition-colors font-sans"
      >
        My Loan Documents
      </Link>
    </div>,
  ];

  return (
    <div className="rounded-2xl relative overflow-hidden" style={{ backgroundColor: '#6AD478' }}>
      {/* Arrow buttons */}
      <button
        onClick={() => goToSlide('prev')}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#1C4332]/10 hover:bg-[#1C4332]/20 flex items-center justify-center transition-colors"
        aria-label="Previous slide"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button
        onClick={() => goToSlide('next')}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#1C4332]/10 hover:bg-[#1C4332]/20 flex items-center justify-center transition-colors"
        aria-label="Next slide"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      {/* Slide content */}
      <div className="px-10 sm:px-16 py-10 sm:py-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {slides[currentSlide]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 pb-5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              currentSlide === index ? 'bg-[#1C4332] w-5' : 'bg-[#1C4332]/30'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

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
  const [quickPayAmount, setQuickPayAmount] = useState('');
  const [quickPayMethod, setQuickPayMethod] = useState('');
  const [quickPayLoanId, setQuickPayLoanId] = useState('');
  const [quickPayFromPerson, setQuickPayFromPerson] = useState('');
  const [quickPayToPerson, setQuickPayToPerson] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [candidateLoans, setCandidateLoans] = useState([]);
  const [notifIndex, setNotifIndex] = useState(0);

  // Auto-carousel notifications every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNotifIndex(prev => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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

    // Check if user has friends
    const acceptedFriendships = friendships.filter(f => f && f.status === 'accepted');
    const hasFriends = acceptedFriendships.length > 0;
    const hasLoans = myLoans.filter(l => l && l.status === 'active').length > 0;
    const hasLendingLoans = lentLoans.length > 0;
    const hasBorrowingLoans = borrowedLoans.length > 0;

    return (
        <div className="min-h-screen" style={{backgroundColor: '#0F2B1F'}}>
          {/* Hero Section */}
          <div className="px-4 pt-20 pb-20 sm:px-8 md:px-24 md:pt-28 md:pb-28 lg:px-36" style={{backgroundColor: '#0F2B1F'}}>
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-8 md:gap-10 w-full"
              >
                {/* Greeting + Quick Action Circles on same row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                  <div>
                    {(() => {
                      const firstName = user.full_name?.split(' ')[0] || 'User';
                      return (
                        <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#C2FFDC] tracking-tight leading-tight font-serif">Welcome Back, {firstName}</p>
                      );
                    })()}
                  </div>

                  {/* Quick Action Circles */}
                  <div className="flex items-start gap-5 sm:gap-6 flex-shrink-0">
                    <Link to={createPageUrl("CreateOffer")} className="flex flex-col items-center gap-1.5 group">
                      <div className="w-12 h-12 rounded-full bg-[#1C4332] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6AD478" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </div>
                      <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">Create<br/>Loan Offer</p>
                    </Link>
                    <Link to={createPageUrl("RecentActivity")} className="flex flex-col items-center gap-1.5 group">
                      <div className="w-12 h-12 rounded-full bg-[#1C4332] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6AD478" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      </div>
                      <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">View Recent<br/>Activity</p>
                    </Link>
                    <Link to={createPageUrl("Friends")} className="flex flex-col items-center gap-1.5 group">
                      <div className="w-12 h-12 rounded-full bg-[#1C4332] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6AD478" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">View Your<br/>Network</p>
                    </Link>
                  </div>
                </div>

                {/* Find Friends - shown above grid if user has no friends */}
                {!hasFriends && (
                  <div className="rounded-2xl px-6 py-8 sm:px-10 sm:py-10 text-center" style={{ backgroundColor: '#6AD478' }}>
                    <p className="text-lg sm:text-xl font-bold text-[#1C4332] font-sans mb-1.5 tracking-tight">
                      Find friends to lend with
                    </p>
                    <p className="text-sm text-[#1C4332]/60 font-sans mb-6 max-w-md mx-auto">
                      Connect with people you trust to start lending and borrowing together
                    </p>
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                      <Link
                        to={createPageUrl("Friends")}
                        className="px-6 py-2.5 rounded-xl bg-[#1C4332] text-sm font-semibold text-[#6AD478] hover:bg-[#1C4332]/90 transition-colors font-sans"
                      >
                        Search for Friends
                      </Link>
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: 'Join me on Vony',
                              text: 'Lending made simple — join me on Vony!',
                              url: 'https://lend-with-vony.com',
                            });
                          } else {
                            navigator.clipboard.writeText('https://lend-with-vony.com');
                          }
                        }}
                        className="px-6 py-2.5 rounded-xl bg-[#1C4332]/15 text-sm font-semibold text-[#1C4332] hover:bg-[#1C4332]/25 transition-colors font-sans"
                      >
                        Invite Friends
                      </button>
                    </div>
                  </div>
                )}

                {/* Two-Column Layout: Left = Overviews stacked, Right = Updates + Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 w-full">
                  {/* Left Column: Lending Overview + Borrowing Overview stacked */}
                  <div className="flex flex-col gap-6 md:gap-8">
                    {/* Lending Overview Box */}
                    <div className="rounded-xl px-4 py-3 shadow-sm bg-[#1C4332]">
                      <p className="text-sm font-bold text-[#C2FFDC] mb-2 tracking-tight font-serif">
                        Lending Overview
                      </p>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-[11px] font-medium text-[#00A86B]">Repaid</p>
                          <p className="text-[11px] font-bold text-[#C2FFDC]">
                            {formatMoney(totalRepaid)} / {formatMoney(totalLentAmount)}
                          </p>
                        </div>
                        <div className="w-full h-5 bg-[#0F2B1F] rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                            style={{
                              width: `${Math.max((totalRepaid / Math.max(totalLentAmount, 1)) * 100, 2)}%`,
                              backgroundColor: '#00A86B'
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
                      <div className="border-t border-[#00A86B]/20 pt-2 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-[#00A86B] mb-0.5">Next Payment Date</p>
                          <div className="flex items-baseline gap-1.5">
                            <p className="text-base font-bold text-[#C2FFDC]">
                              {nextLenderPayment ? format(nextLenderPayment.date, 'EEE, MMM d') : 'N/A'}
                            </p>
                            {nextLenderPayment && (
                              <p className="text-[11px] text-[#00A86B]">
                                {(() => {
                                  const days = Math.ceil((nextLenderPayment.date - new Date()) / (1000 * 60 * 60 * 24));
                                  return days > 0 ? `${days}d away` : days === 0 ? 'Due today' : `${Math.abs(days)}d overdue`;
                                })()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#00A86B] mb-0.5">Next Payment Amount</p>
                          <div className="flex items-baseline gap-1.5">
                            <p className="text-base font-bold text-[#C2FFDC]">
                              {nextLenderPayment ? formatMoney(nextLenderPayment.payment_amount || 0) : 'N/A'}
                            </p>
                            {nextLenderPayment && (
                              <p className="text-[11px] text-[#00A86B]">
                                from @{nextLenderPayment.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Borrowing Overview Box */}
                    <div className="rounded-xl px-4 py-3 shadow-sm bg-[#1C4332]">
                      <p className="text-sm font-bold text-[#C2FFDC] mb-2 tracking-tight font-serif">
                        Borrowing Overview
                      </p>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-[11px] font-medium text-[#00A86B]">Paid Back</p>
                          <p className="text-[11px] font-bold text-[#C2FFDC]">
                            {formatMoney(totalPaidBack)} / {formatMoney(totalBorrowedAmount)}
                          </p>
                        </div>
                        <div className="w-full h-5 bg-[#0F2B1F] rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                            style={{
                              width: `${Math.max((totalPaidBack / Math.max(totalBorrowedAmount, 1)) * 100, 2)}%`,
                              backgroundColor: '#00A86B'
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
                      <div className="border-t border-[#00A86B]/20 pt-2 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-[#00A86B] mb-0.5">Next Payment Date</p>
                          <div className="flex items-baseline gap-1.5">
                            <p className="text-base font-bold text-[#C2FFDC]">
                              {nextBorrowerPayment ? format(nextBorrowerPayment.date, 'EEE, MMM d') : 'N/A'}
                            </p>
                            {nextBorrowerPayment && (
                              <p className="text-[11px] text-[#00A86B]">
                                {(() => {
                                  const days = Math.ceil((nextBorrowerPayment.date - new Date()) / (1000 * 60 * 60 * 24));
                                  return days > 0 ? `${days}d away` : days === 0 ? 'Due today' : `${Math.abs(days)}d overdue`;
                                })()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#00A86B] mb-0.5">Next Payment Amount</p>
                          <div className="flex items-baseline gap-1.5">
                            <p className="text-base font-bold text-[#C2FFDC]">
                              {nextBorrowerPayment ? formatMoney(nextBorrowerPayment.payment_amount || 0) : 'N/A'}
                            </p>
                            {nextBorrowerPayment && (
                              <p className="text-[11px] text-[#00A86B]">
                                to @{nextBorrowerPayment.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Record Payment Box */}
                    {myLoans.filter(l => l && l.status === 'active').length > 0 && (() => {
                      const activeLoansAll = myLoans.filter(l => l && l.status === 'active');

                      // "From" options: everyone who owes you money (borrowers in your lending loans)
                      const fromOptions = [];
                      const lendingLoansActive = activeLoansAll.filter(l => l.lender_id === user.id);
                      const borrowerIds = [...new Set(lendingLoansActive.map(l => l.borrower_id))];
                      borrowerIds.forEach(bId => {
                        const profile = safeAllProfiles.find(p => p.user_id === bId);
                        fromOptions.push({ userId: bId, username: profile?.username || 'user', fullName: profile?.full_name || 'Unknown' });
                      });

                      // "To" options: everyone you owe money to (lenders in your borrowing loans)
                      const toOptions = [];
                      const borrowingLoansActive = activeLoansAll.filter(l => l.borrower_id === user.id);
                      const lenderIds = [...new Set(borrowingLoansActive.map(l => l.lender_id))];
                      lenderIds.forEach(lId => {
                        const profile = safeAllProfiles.find(p => p.user_id === lId);
                        toOptions.push({ userId: lId, username: profile?.username || 'user', fullName: profile?.full_name || 'Unknown' });
                      });

                      // Self-filtering: if "from" selected, check if that person also appears as someone you owe (unlikely but handle)
                      // If "to" selected, check if that person also appears as someone who owes you
                      // The dropdowns auto-fill each other if there's a unique match through a shared loan

                      const handleFromChange = (val) => {
                        setQuickPayFromPerson(val);
                        // Check if this person has a loan where they also appear in the "to" direction
                        // Find loans where this person owes you
                        const loansFromPerson = lendingLoansActive.filter(l => l.borrower_id === val);
                        // If only one "to" person matches across those loans, auto-fill
                        if (!quickPayToPerson) {
                          // No auto-fill needed for "to" from "from" - they are independent directions
                        }
                      };

                      const handleToChange = (val) => {
                        setQuickPayToPerson(val);
                      };

                      // Determine which loans match the current selection for the modal
                      const getMatchingLoans = () => {
                        if (quickPayFromPerson && !quickPayToPerson) {
                          // Recording a payment FROM someone who owes you (lending loan)
                          return lendingLoansActive.filter(l => l.borrower_id === quickPayFromPerson);
                        } else if (quickPayToPerson && !quickPayFromPerson) {
                          // Recording a payment TO someone you owe (borrowing loan)
                          return borrowingLoansActive.filter(l => l.lender_id === quickPayToPerson);
                        } else if (quickPayFromPerson && quickPayToPerson) {
                          // Both selected — find loans matching either direction
                          const fromLoans = lendingLoansActive.filter(l => l.borrower_id === quickPayFromPerson);
                          const toLoans = borrowingLoansActive.filter(l => l.lender_id === quickPayToPerson);
                          return [...fromLoans, ...toLoans];
                        }
                        return activeLoansAll;
                      };

                      const handleSubmit = () => {
                        const matching = getMatchingLoans();
                        if (matching.length === 1) {
                          setSelectedLoan({
                            ...matching[0],
                            _prefillAmount: quickPayAmount,
                            _prefillMethod: quickPayMethod,
                          });
                          setCandidateLoans([]);
                          setShowPaymentModal(true);
                        } else if (matching.length > 1) {
                          setCandidateLoans(matching);
                          setSelectedLoan({
                            ...matching[0],
                            _prefillAmount: quickPayAmount,
                            _prefillMethod: quickPayMethod,
                          });
                          setShowPaymentModal(true);
                        }
                      };

                      const canSubmit = quickPayAmount && (quickPayFromPerson || quickPayToPerson);

                      return (
                        <div className="rounded-xl px-4 py-3 shadow-sm mt-2 mb-2 lg:mt-0 lg:mb-0" style={{ backgroundColor: '#6AD478' }}>
                          <p className="text-sm font-bold text-[#1C4332] mb-2 tracking-tight font-serif">
                            Record Payment
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#1C4332]">
                            <span>Record payment of</span>
                            <span className="font-medium">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder=""
                              value={quickPayAmount}
                              onChange={(e) => setQuickPayAmount(e.target.value)}
                              className="w-20 h-7 px-2 bg-[#C2FFDC] border-0 text-xs inline-flex rounded-md text-[#1C4332] placeholder:text-[#1C4332]/50"
                              style={{ MozAppearance: 'textfield' }}
                            />
                            {fromOptions.length > 0 && (
                              <>
                                <span>from</span>
                                <Select
                                  value={quickPayFromPerson}
                                  onValueChange={handleFromChange}
                                >
                                  <SelectTrigger className="w-auto h-7 px-2 bg-[#C2FFDC] border-0 text-xs inline-flex rounded-md text-[#1C4332]">
                                    <SelectValue placeholder="select person" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fromOptions.map((person) => (
                                      <SelectItem key={person.userId} value={person.userId}>
                                        @{person.username}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                            {toOptions.length > 0 && (
                              <>
                                <span>to</span>
                                <Select
                                  value={quickPayToPerson}
                                  onValueChange={handleToChange}
                                >
                                  <SelectTrigger className="w-auto h-7 px-2 bg-[#C2FFDC] border-0 text-xs inline-flex rounded-md text-[#1C4332]">
                                    <SelectValue placeholder="select person" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {toOptions.map((person) => (
                                      <SelectItem key={person.userId} value={person.userId}>
                                        @{person.username}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                            <Button
                              type="button"
                              onClick={handleSubmit}
                              disabled={!canSubmit}
                              className={`h-7 px-3 rounded-md text-xs font-semibold border-0 transition-all ${
                                !canSubmit
                                  ? 'bg-[#00A86B]/30 text-[#1C4332]/50 cursor-not-allowed'
                                  : 'bg-[#00A86B] text-white hover:bg-[#00A86B]/90'
                              }`}
                            >
                              Submit
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Loans Over Time Bar Chart */}
                    {myLoans.filter(l => l && (l.status === 'active' || l.status === 'completed')).length > 0 && (() => {
                      const allRelevantLoans = myLoans.filter(l => l && (l.status === 'active' || l.status === 'completed'));
                      const safePayments = Array.isArray(payments) ? payments : [];

                      // Find the earliest loan creation month
                      const loanDates = allRelevantLoans
                        .map(l => new Date(l.created_at))
                        .filter(d => !isNaN(d.getTime()));
                      if (loanDates.length === 0) return null;

                      const earliestDate = loanDates.reduce((min, d) => d < min ? d : min, loanDates[0]);
                      const chartStartMonth = startOfMonth(earliestDate);
                      const now = new Date();
                      const currentMonth = startOfMonth(now);
                      const isCurrentMonthFn = (m) => m.getFullYear() === currentMonth.getFullYear() && m.getMonth() === currentMonth.getMonth();

                      // Build exactly 6 months starting from earliest loan month
                      const months = [];
                      for (let i = 0; i < 6; i++) {
                        months.push(addMonths(chartStartMonth, i));
                      }

                      const chartData = months.map(monthDate => {
                        const monthEndDate = endOfMonth(monthDate);
                        const isCurrent = isCurrentMonthFn(monthDate);
                        const isFuture = isAfter(monthDate, currentMonth);
                        const snapshotDate = isCurrent ? now : (isFuture ? now : monthEndDate);

                        let owedToYou = 0;
                        let youOwe = 0;

                        allRelevantLoans.forEach(loan => {
                          const loanCreated = new Date(loan.created_at);
                          if (isAfter(loanCreated, snapshotDate)) return;

                          const totalAmount = loan.total_amount || loan.amount || 0;
                          const isLender = loan.lender_id === user.id;

                          const loanPayments = safePayments.filter(p =>
                            p && p.loan_id === loan.id &&
                            (p.status === 'completed' || p.status === 'pending_confirmation') &&
                            !isAfter(new Date(p.payment_date || p.created_at), snapshotDate)
                          );
                          const totalPaid = loanPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

                          const effectivePaid = isCurrent ? (loan.amount_paid || 0) : totalPaid;
                          const remaining = Math.max(0, totalAmount - effectivePaid);

                          if (isFuture) {
                            const currentRemaining = Math.max(0, totalAmount - (loan.amount_paid || 0));
                            if (isLender) owedToYou += currentRemaining;
                            else youOwe += currentRemaining;
                            return;
                          }

                          if (isLender) owedToYou += remaining;
                          else youOwe += remaining;
                        });

                        return {
                          month: monthDate,
                          owedToYou,
                          youOwe,
                          label: format(monthDate, 'MMM'),
                          isCurrent,
                          isFuture
                        };
                      });

                      const maxVal = Math.max(
                        ...chartData.map(d => d.owedToYou),
                        ...chartData.map(d => d.youOwe),
                        1
                      );

                      const chartHeight = 120;
                      const barWidth = 14;
                      const pairGap = 3;

                      // Y-axis labels: show 3 ticks (0, mid, max)
                      const yMax = maxVal;
                      const yMid = Math.round(yMax / 2);
                      const formatYLabel = (v) => v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${v}`;

                      return (
                        <div className="rounded-xl px-4 py-3 shadow-sm bg-[#1C4332]">
                          <p className="text-sm font-bold text-[#C2FFDC] mb-3 tracking-tight font-serif">
                            Loans Over Time
                          </p>

                          {/* Chart with Y-axis */}
                          <div className="flex">
                            {/* Y-axis labels */}
                            <div className="flex flex-col justify-between pr-2 flex-shrink-0" style={{ height: chartHeight }}>
                              <p className="text-[9px] text-[#00A86B] text-right leading-none">{formatYLabel(Math.round(yMax))}</p>
                              <p className="text-[9px] text-[#00A86B] text-right leading-none">{formatYLabel(yMid)}</p>
                              <p className="text-[9px] text-[#00A86B] text-right leading-none">$0</p>
                            </div>

                            {/* Bars — spread to fill full width */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-end justify-between w-full" style={{ height: chartHeight }}>
                                {chartData.map((data, i) => {
                                  const owedHeight = maxVal > 0 ? (data.owedToYou / maxVal) * chartHeight : 0;
                                  const oweHeight = maxVal > 0 ? (data.youOwe / maxVal) * chartHeight : 0;

                                  return (
                                    <div key={i} className="flex flex-col items-center flex-1">
                                      <div className="flex items-end justify-center" style={{ gap: pairGap, height: chartHeight }}>
                                        <div
                                          className="rounded-t-sm transition-all duration-300"
                                          style={{
                                            width: barWidth,
                                            height: Math.max(owedHeight, owedHeight > 0 ? 2 : 0),
                                            backgroundColor: '#00A86B',
                                            opacity: data.isFuture ? 0.35 : 1
                                          }}
                                          title={`${data.label}: $${data.owedToYou.toLocaleString(undefined, { maximumFractionDigits: 0 })} owed to you`}
                                        />
                                        <div
                                          className="rounded-t-sm transition-all duration-300"
                                          style={{
                                            width: barWidth,
                                            height: Math.max(oweHeight, oweHeight > 0 ? 2 : 0),
                                            backgroundColor: '#6AD478',
                                            opacity: data.isFuture ? 0.35 : 1
                                          }}
                                          title={`${data.label}: $${data.youOwe.toLocaleString(undefined, { maximumFractionDigits: 0 })} you owe`}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Month labels — spread to match */}
                              <div className="flex justify-between w-full mt-1.5">
                                {chartData.map((data, i) => (
                                  <p
                                    key={i}
                                    className={`text-[10px] text-center flex-1 ${data.isCurrent ? 'font-bold text-[#C2FFDC]' : 'text-[#00A86B]'}`}
                                  >
                                    {data.label}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Key / Legend — centered */}
                          <div className="flex items-center justify-center gap-4 mt-3 pt-2.5 border-t border-[#00A86B]/20">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#00A86B' }} />
                              <p className="text-[11px] text-[#C2FFDC]">Owed to you</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6AD478' }} />
                              <p className="text-[11px] text-[#C2FFDC]">You owe</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column: Updates */}
                  <div className="flex flex-col gap-6 md:gap-8">
                    {/* Combined Requests + Notifications Carousel */}
                    {(() => {
                      const today = new Date();
                      const nextWeek = addDays(today, 7);
                      const activeNotifLoans = myLoans.filter(l => l && l.status === 'active' && l.next_payment_date);
                      const allItems = [];

                      // Add request items first
                      if (pendingOffers.length > 0) {
                        allItems.push({
                          text: `You have ${pendingOffers.length} new update${pendingOffers.length !== 1 ? 's' : ''}`,
                          link: 'Requests',
                          icon: 'bell'
                        });
                      }

                      // Count overdue payments you owe
                      const overdueYouOwe = activeNotifLoans.filter(l => {
                        const d = new Date(l.next_payment_date);
                        return l.borrower_id === user.id && d < today;
                      });
                      if (overdueYouOwe.length >= 2) {
                        allItems.push({
                          text: `You have ${overdueYouOwe.length} overdue payments`,
                          link: 'Borrowing',
                          icon: 'clock'
                        });
                      }

                      // Specific overdue loan messages (you owe)
                      overdueYouOwe.forEach(loan => {
                        const lenderProfile = safeAllProfiles.find(p => p.user_id === loan.lender_id);
                        allItems.push({
                          text: `Your payment to @${lenderProfile?.username || 'user'} is overdue. If you made a payment, make sure to record it.`,
                          link: 'Borrowing',
                          icon: 'clock'
                        });
                      });

                      // Payments coming up this week (you owe)
                      const upcomingYouOwe = activeNotifLoans.filter(l => {
                        const d = new Date(l.next_payment_date);
                        return l.borrower_id === user.id && d >= today && d <= nextWeek;
                      });
                      if (upcomingYouOwe.length > 0) {
                        allItems.push({
                          text: `You have ${upcomingYouOwe.length} payment${upcomingYouOwe.length !== 1 ? 's' : ''} coming up this week`,
                          link: 'Borrowing',
                          icon: 'clock'
                        });
                      }

                      // Payments you're due to receive this week
                      const upcomingReceive = activeNotifLoans.filter(l => {
                        const d = new Date(l.next_payment_date);
                        return l.lender_id === user.id && d >= today && d <= nextWeek;
                      });
                      if (upcomingReceive.length > 0) {
                        allItems.push({
                          text: `You are due to receive ${upcomingReceive.length} payment${upcomingReceive.length !== 1 ? 's' : ''} this week`,
                          link: 'Lending',
                          icon: 'clock'
                        });
                      }

                      // Overdue payments from borrowers (you are the lender)
                      const overdueFromOthers = activeNotifLoans.filter(l => {
                        const d = new Date(l.next_payment_date);
                        return l.lender_id === user.id && d < today;
                      });
                      overdueFromOthers.forEach(loan => {
                        const borrowerProfile = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
                        allItems.push({
                          text: `@${borrowerProfile?.username || 'user'}'s payment to you is overdue. If they made a payment, make sure to record it.`,
                          link: 'Lending',
                          icon: 'clock'
                        });
                      });

                      // Fallback: no items at all
                      if (allItems.length === 0) {
                        return (
                          <div className="rounded-xl px-4 py-3 shadow-sm flex items-center gap-3" style={{ backgroundColor: '#6AD478' }}>
                            <div className="w-10 h-10 rounded-full bg-[#1C4332]/15 flex items-center justify-center flex-shrink-0">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                              </svg>
                            </div>
                            <p className="text-sm font-bold text-[#1C4332] tracking-tight font-sans flex-1">
                              You have no new notifications
                            </p>
                          </div>
                        );
                      }

                      const safeIdx = notifIndex % allItems.length;
                      const current = allItems[safeIdx];

                      return (
                        <div className="rounded-xl px-4 py-3 shadow-sm flex items-center gap-3" style={{ backgroundColor: '#6AD478' }}>
                          <div className="w-10 h-10 rounded-full bg-[#1C4332]/15 flex items-center justify-center flex-shrink-0">
                            {current.icon === 'bell' ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <AnimatePresence mode="wait">
                              <motion.p
                                key={safeIdx}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.25 }}
                                className="text-sm font-bold text-[#1C4332] tracking-tight font-sans leading-snug"
                              >
                                {current.text}
                              </motion.p>
                            </AnimatePresence>
                          </div>
                          <Link
                            to={createPageUrl(current.link)}
                            className="flex-shrink-0 px-4 py-1.5 rounded-lg bg-[#1C4332] text-xs font-semibold text-[#6AD478] hover:bg-[#1C4332]/90 transition-colors font-sans whitespace-nowrap"
                          >
                            {current.icon === 'bell' ? 'View Updates' : `Go to ${current.link}`}
                          </Link>
                          {allItems.length > 1 && (
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              {allItems.map((_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setNotifIndex(i)}
                                  className={`rounded-full transition-all cursor-pointer ${
                                    i === safeIdx ? 'w-1.5 h-3 bg-[#1C4332]' : 'w-1.5 h-1.5 bg-[#1C4332]/30'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Upcoming & Overdue Payments — shared data computation */}
                    {(() => {
                      const safePaymentsUp = Array.isArray(payments) ? payments : [];
                      const activeLoansForPayments = myLoans.filter(l => l && l.status === 'active' && l.next_payment_date);

                      // Build all payment events with remaining amounts
                      const allEvents = activeLoansForPayments
                        .map(loan => {
                          const isLender = loan.lender_id === user.id;
                          const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
                          const otherProfile = safeAllProfiles.find(p => p.user_id === otherUserId);
                          const paymentDate = new Date(loan.next_payment_date);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const payDateClean = new Date(paymentDate);
                          payDateClean.setHours(0, 0, 0, 0);
                          const days = differenceInDays(payDateClean, today);

                          // Remaining amount for this payment period
                          const loanPayments = safePaymentsUp.filter(p => p && p.loan_id === loan.id);
                          const now = new Date();
                          const nextPayDate = new Date(loan.next_payment_date);
                          let periodStart = new Date(nextPayDate);
                          const freq = loan.payment_frequency || 'monthly';
                          if (freq === 'weekly') periodStart.setDate(periodStart.getDate() - 7);
                          else if (freq === 'bi-weekly') periodStart.setDate(periodStart.getDate() - 14);
                          else periodStart.setMonth(periodStart.getMonth() - 1);

                          const paidThisPeriod = loanPayments
                            .filter(p => {
                              const pDate = new Date(p.payment_date || p.created_at);
                              return pDate >= periodStart && pDate <= now && p.status === 'completed';
                            })
                            .reduce((sum, p) => sum + (p.amount || 0), 0);

                          const originalAmount = loan.payment_amount || 0;
                          const remainingAmount = Math.max(0, originalAmount - paidThisPeriod);

                          return {
                            loan,
                            date: paymentDate,
                            days,
                            originalAmount,
                            remainingAmount,
                            username: otherProfile?.username || 'user',
                            isLender,
                            loanId: loan.id
                          };
                        })
                        .filter(e => e.remainingAmount > 0)
                        .sort((a, b) => a.date - b.date);

                      // Combine upcoming and overdue into one list, overdue first then upcoming
                      const overdueEvents = allEvents.filter(e => e.days < 0);
                      const upcomingEvents = allEvents.filter(e => e.days >= 0).slice(0, 5);
                      const combinedEvents = [...overdueEvents, ...upcomingEvents];

                      return (
                          /* Upcoming Payments Box (includes overdue with minus prefix) */
                          <div className="rounded-xl px-4 py-3 shadow-sm bg-[#1C4332]">
                            <p className="text-sm font-bold text-[#C2FFDC] mb-2.5 tracking-tight font-serif">
                              Upcoming Payments
                            </p>
                            {combinedEvents.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-6 text-[#00A86B]">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 mb-1.5">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                  <line x1="16" y1="2" x2="16" y2="6"></line>
                                  <line x1="8" y1="2" x2="8" y2="6"></line>
                                  <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <p className="text-xs">No upcoming payments</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {combinedEvents.map((event, idx) => {
                                  const amountStr = event.remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  const dueDateStr = format(event.date, 'MMM d, yyyy');
                                  const loanPage = event.isLender ? 'Lending' : 'Borrowing';
                                  const isOverdue = event.days < 0;
                                  const displayDays = isOverdue ? `-${Math.abs(event.days)}` : event.days;

                                  return (
                                    <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#0F2B1F]">
                                      {/* Circle with days (minus prefix for overdue) */}
                                      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm bg-[#6AD478]">
                                        <p className="text-[10px] font-bold text-center leading-tight text-[#1C4332]">
                                          {displayDays}
                                          <span className="block text-[7px] font-medium text-[#1C4332]/60">
                                            {Math.abs(event.days) === 1 ? 'day' : 'days'}
                                          </span>
                                        </p>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-[#C2FFDC]">
                                          {event.isLender
                                            ? <>Receive payment of <span className="font-semibold">${amountStr}</span> from <span className="font-semibold">@{event.username}</span></>
                                            : <>Send payment of <span className="font-semibold">${amountStr}</span> to <span className="font-semibold">@{event.username}</span></>
                                          }
                                        </p>
                                        <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-red-400' : 'text-[#00A86B]'}`}>{dueDateStr}</p>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {isOverdue && (
                                          <span className="text-[9px] font-semibold px-2.5 py-1 rounded-md bg-red-500 text-white">
                                            Overdue
                                          </span>
                                        )}
                                        <Link
                                          to={createPageUrl(loanPage)}
                                          className="text-[9px] font-semibold px-2.5 py-1 rounded-md"
                                          style={{ backgroundColor: '#6AD478', color: '#1C4332' }}
                                        >
                                          View Loan
                                        </Link>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                      );
                    })()}

                    {/* View Lending / Borrowing Page */}
                    <div className="flex items-center justify-center gap-8 py-2">
                      <Link to={createPageUrl("Lending")} className="flex flex-col items-center gap-1.5 group">
                        <div className="w-11 h-11 rounded-full bg-[#1C4332] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6AD478" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>
                        </div>
                        <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">View Lending<br/>Page</p>
                      </Link>
                      <Link to={createPageUrl("Borrowing")} className="flex flex-col items-center gap-1.5 group">
                        <div className="w-11 h-11 rounded-full bg-[#1C4332] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6AD478" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                          </svg>
                        </div>
                        <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">View Borrowing<br/>Page</p>
                      </Link>
                      <Link to={createPageUrl("LoanAgreements")} className="flex flex-col items-center gap-1.5 group">
                        <div className="w-11 h-11 rounded-full bg-[#1C4332] shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6AD478" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                          </svg>
                        </div>
                        <p className="text-[10px] font-semibold text-[#C2FFDC] text-center leading-tight font-sans">View<br/>Documents</p>
                      </Link>
                    </div>

                    {/* Recent Activity Box */}
                    <div className="rounded-xl px-4 py-3 shadow-sm bg-[#1C4332]">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-sm font-bold text-[#C2FFDC] tracking-tight font-serif">
                          Recent Activity
                        </p>
                        <Link to={createPageUrl("RecentActivity")} className="text-[10px] font-semibold text-[#00A86B] hover:underline">
                          View All
                        </Link>
                      </div>
                      {(() => {
                        const safePaymentsRecent = Array.isArray(payments) ? payments : [];

                        // Build activity items matching Recent Activity page format
                        const activityItems = [];

                        // Payment events
                        safePaymentsRecent
                          .filter(p => p && myLoans.some(l => l.id === p.loan_id))
                          .forEach(p => {
                            const loan = myLoans.find(l => l.id === p.loan_id);
                            if (!loan) return;
                            const isBorrower = loan.borrower_id === user.id;
                            const otherUserId = isBorrower ? loan.lender_id : loan.borrower_id;
                            const otherProfile = safeAllProfiles.find(pr => pr.user_id === otherUserId);
                            const amount = `$${(p.amount || 0).toLocaleString()}`;
                            const username = `@${otherProfile?.username || 'user'}`;
                            activityItems.push({
                              type: 'payment',
                              date: new Date(p.payment_date || p.created_at),
                              description: isBorrower
                                ? `You made a ${amount} payment to ${username}`
                                : `Received ${amount} payment from ${username}`
                            });
                          });

                        // Loan creation events
                        myLoans.forEach(loan => {
                          if (!loan) return;
                          const isLender = loan.lender_id === user.id;
                          const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
                          const otherProfile = safeAllProfiles.find(pr => pr.user_id === otherUserId);
                          const amount = `$${(loan.amount || 0).toLocaleString()}`;
                          const username = `@${otherProfile?.username || 'user'}`;
                          const reason = loan.purpose || 'loan';
                          let desc = '';
                          if (loan.status === 'pending' || !loan.status) {
                            desc = isLender ? `Sent ${amount} loan offer to ${username} for ${reason}` : `Received ${amount} loan offer from ${username} for ${reason}`;
                          } else if (loan.status === 'active') {
                            desc = isLender ? `${username} accepted your ${amount} loan for ${reason}` : `You accepted ${amount} loan from ${username} for ${reason}`;
                          } else if (loan.status === 'declined') {
                            desc = isLender ? `${username} declined your ${amount} loan for ${reason}` : `You declined ${amount} loan from ${username} for ${reason}`;
                          } else if (loan.status === 'cancelled') {
                            desc = isLender ? `You cancelled ${amount} loan offer to ${username}` : `${username} cancelled their ${amount} loan offer`;
                          } else if (loan.status === 'completed') {
                            desc = isLender ? `${username} fully repaid your ${amount} loan` : `You fully repaid ${amount} loan to ${username}`;
                          } else {
                            desc = isLender ? `${amount} loan to ${username}` : `${amount} loan from ${username}`;
                          }
                          activityItems.push({
                            type: 'loan',
                            date: new Date(loan.created_at),
                            description: desc
                          });
                        });

                        // Sort by date descending, take 4
                        const recent = activityItems
                          .sort((a, b) => b.date - a.date)
                          .slice(0, 4);

                        if (recent.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-6 text-[#00A86B]">
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 mb-1.5">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                              </svg>
                              <p className="text-xs">No recent activity</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-1.5">
                            {recent.map((item, idx) => {
                              const isPayment = item.type === 'payment';
                              const iconColor = '#6AD478';

                              return (
                                <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0F2B1F]">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6AD478]/20 flex items-center justify-center shadow-sm">
                                    {isPayment ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                      </svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-[#C2FFDC] truncate">{item.description}</p>
                                    <p className="text-[9px] text-[#00A86B]">{format(item.date, 'MMM d, yyyy')}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>

              </motion.div>

            </div>
          </div>

          {/* Bottom Section: Carousel (if has loans) or Find Friends (if has friends but shown regardless as fallback) */}
          <div className="px-4 pt-4 pb-8 sm:px-8 md:px-24 md:pt-4 md:pb-10 lg:px-36" style={{backgroundColor: '#0F2B1F'}}>
            <div className="max-w-6xl mx-auto">
              {hasLoans ? (
                <LoanCarousel
                  hasLendingLoans={hasLendingLoans}
                  hasBorrowingLoans={hasBorrowingLoans}
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <div className="rounded-2xl px-6 py-10 sm:px-10 sm:py-14 text-center" style={{ backgroundColor: '#6AD478' }}>
                    <p className="text-xl sm:text-2xl font-bold text-[#1C4332] font-sans mb-2 tracking-tight">
                      Find friends to lend with
                    </p>
                    <p className="text-sm text-[#1C4332]/60 font-sans mb-8 max-w-md mx-auto">
                      Connect with people you trust to start lending and borrowing together
                    </p>
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                      <Link
                        to={createPageUrl("Friends")}
                        className="px-6 py-2.5 rounded-xl bg-[#1C4332] text-sm font-semibold text-[#6AD478] hover:bg-[#1C4332]/90 transition-colors font-sans"
                      >
                        Search for Friends
                      </Link>
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: 'Join me on Vony',
                              text: 'Lending made simple — join me on Vony!',
                              url: 'https://lend-with-vony.com',
                            });
                          } else {
                            navigator.clipboard.writeText('https://lend-with-vony.com');
                          }
                        }}
                        className="px-6 py-2.5 rounded-xl bg-[#1C4332]/15 text-sm font-semibold text-[#1C4332] hover:bg-[#1C4332]/25 transition-colors font-sans"
                      >
                        Invite Friends
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Record Payment Modal */}
          {showPaymentModal && selectedLoan && (
            <RecordPaymentModal
              loan={selectedLoan}
              candidateLoans={candidateLoans}
              onClose={() => {
                setShowPaymentModal(false);
                setSelectedLoan(null);
                setCandidateLoans([]);
                setQuickPayAmount('');
                setQuickPayMethod('');
                setQuickPayLoanId('');
                setQuickPayFromPerson('');
                setQuickPayToPerson('');
              }}
              onPaymentComplete={() => {
                setShowPaymentModal(false);
                setSelectedLoan(null);
                setCandidateLoans([]);
                setQuickPayAmount('');
                setQuickPayMethod('');
                setQuickPayLoanId('');
                setQuickPayFromPerson('');
                setQuickPayToPerson('');
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

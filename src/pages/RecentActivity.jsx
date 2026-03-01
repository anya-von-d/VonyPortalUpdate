import React, { useState, useEffect } from "react";
import { Loan, Payment, User, PublicProfile } from "@/entities/all";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowUpRight, ArrowDownRight, Send, Check, X, Ban, FileText, DollarSign, Eye, ChevronDown, Users, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  pending: { bg: 'bg-[#6EE8A2]', icon: Clock, iconColor: 'text-slate-500', textColor: 'text-slate-600' },
  active: { bg: 'bg-[#30FFA8]', icon: Activity, iconColor: 'text-[#00A86B]', textColor: 'text-[#00A86B]' },
  completed: { bg: 'bg-[#96FFD0]', icon: CheckCircle, iconColor: 'text-[#00A86B]', textColor: 'text-[#00A86B]' },
  defaulted: { bg: 'bg-[#AAFFA3]', icon: AlertCircle, iconColor: 'text-red-500', textColor: 'text-red-500' },
  cancelled: { bg: 'bg-[#6EE8A2]', icon: XCircle, iconColor: 'text-red-500', textColor: 'text-red-500' },
  declined: { bg: 'bg-[#6EE8A2]', icon: XCircle, iconColor: 'text-red-500', textColor: 'text-red-500' }
};

const bgColors = ['#AAFFA3', '#30FFA8', '#96FFD0', '#74FF71', '#83F384', '#6EE8A2'];

export default function RecentActivityPage() {
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [user, setUser] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

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
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const [allLoans, allPayments, allProfiles] = await Promise.all([
        safeEntityCall(() => Loan.list('-created_at')),
        safeEntityCall(() => Payment.list('-created_at')),
        safeEntityCall(() => PublicProfile.list()),
      ]);

      setLoans(allLoans);
      setPayments(allPayments);
      setPublicProfiles(allProfiles);
    } catch (error) {
      console.error("User not authenticated or data load error:", error);
      setUser(null);
      setLoans([]);
      setPayments([]);
      setPublicProfiles([]);
    }
    setIsLoading(false);
  };

  const getUserById = (userId) => {
    const foundUser = publicProfiles.find(u => u && u.user_id === userId);
    if (foundUser) {
      return foundUser;
    }
    return {
      id: userId,
      username: 'user',
      full_name: 'Unknown User',
      profile_picture_url: null
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-4xl mx-auto space-y-7">
          <div className="py-5">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-left">
              Activity
            </h1>
          </div>
          <div className="bg-[#DBFFEB] rounded-2xl p-5">
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="w-8 h-8 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm">Loading activity...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-4xl mx-auto space-y-7">
          <div className="py-5">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-left">
              Activity
            </h1>
          </div>
          <div className="bg-[#DBFFEB] rounded-2xl p-5">
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">Please log in to view activity</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const safeLoans = Array.isArray(loans) ? loans : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const myLoans = safeLoans.filter(loan => loan && (loan.lender_id === user.id || loan.borrower_id === user.id));
  const myLoanIds = myLoans.map(l => l && l.id).filter(Boolean);
  const myPayments = safePayments.filter(p => p && myLoanIds.includes(p.loan_id));

  const loanActivities = myLoans.map(loan => ({
    type: 'loan',
    ...loan,
    date: loan.created_at
  }));

  const paymentActivities = myPayments.map(payment => ({
    type: 'payment',
    ...payment,
    date: payment.payment_date || payment.created_at
  }));

  let allActivities = [...loanActivities, ...paymentActivities]
    .filter(activity => activity && activity.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Apply filters
  if (filterType !== "all") {
    allActivities = allActivities.filter(a => a.type === filterType);
  }

  if (filterStatus !== "all") {
    if (filterStatus === 'pending_sent') {
      allActivities = allActivities.filter(a => {
        if (a.type !== 'loan') return false;
        const isLender = a.lender_id === user.id;
        return (a.status === 'pending' || !a.status) && isLender;
      });
    } else if (filterStatus === 'pending_received') {
      allActivities = allActivities.filter(a => {
        if (a.type !== 'loan') return false;
        const isLender = a.lender_id === user.id;
        return (a.status === 'pending' || !a.status) && !isLender;
      });
    } else {
      allActivities = allActivities.filter(a => a.status === filterStatus);
    }
  }

  if (filterPayment !== "all") {
    allActivities = allActivities.filter(a => {
      if (a.type === 'payment') {
        const associatedLoan = safeLoans.find(l => l && l.id === a.loan_id);
        if (!associatedLoan) return false;
        const isBorrower = associatedLoan.borrower_id === user.id;
        if (filterPayment === "sent") return isBorrower;
        if (filterPayment === "received") return !isBorrower;
      }
      return true;
    });
  }

  const getActivityInfo = (activity) => {
    if (!activity) return { title: "Activity", description: "", icon: Activity, status: null };

    let title = "Activity";
    let description = "";
    let icon = Activity;
    let status = activity.status;

    if (activity.type === 'loan') {
      const isLender = activity.lender_id === user.id;
      const otherPartyId = isLender ? activity.borrower_id : activity.lender_id;
      const otherParty = getUserById(otherPartyId);
      const amount = `$${activity.amount?.toLocaleString() || '0'}`;
      const username = `@${otherParty?.username || 'user'}`;
      const reason = activity.purpose || 'Reason';

      if (activity.status === 'pending' || !activity.status) {
        if (isLender) {
          title = `Sent ${amount} loan offer to ${username} for ${reason}`;
          icon = Send;
        } else {
          title = `Received ${amount} loan offer from ${username} for ${reason}`;
          icon = ArrowDownRight;
        }
      } else if (activity.status === 'active') {
        if (isLender) {
          title = `${username} accepted your ${amount} loan for ${reason}`;
        } else {
          title = `You accepted ${amount} loan from ${username} for ${reason}`;
        }
        icon = Check;
      } else if (activity.status === 'declined') {
        if (isLender) {
          title = `${username} declined your ${amount} loan for ${reason}`;
        } else {
          title = `You declined ${amount} loan from ${username} for ${reason}`;
        }
        icon = X;
      } else if (activity.status === 'cancelled') {
        if (isLender) {
          title = `You cancelled ${amount} loan offer to ${username} for ${reason}`;
        } else {
          title = `${username} cancelled their ${amount} loan offer for ${reason}`;
        }
        icon = Ban;
      } else if (activity.status === 'completed') {
        if (isLender) {
          title = `${username} fully repaid your ${amount} loan for ${reason}`;
        } else {
          title = `You fully repaid ${amount} loan to ${username} for ${reason}`;
        }
        icon = Check;
      } else {
        title = isLender
          ? `${amount} loan to ${username}`
          : `${amount} loan from ${username}`;
        icon = Activity;
      }

      description = activity.date ? format(new Date(activity.date), 'MMM d, yyyy • h:mm a') : 'N/A';
    }

    if (activity.type === 'payment') {
      const associatedLoan = safeLoans.find(l => l && l.id === activity.loan_id);
      if (!associatedLoan) return { title: "Payment", description: "", icon: Activity, status: null };

      const isBorrower = associatedLoan.borrower_id === user.id;
      const otherPartyId = isBorrower ? associatedLoan.lender_id : associatedLoan.borrower_id;
      const otherParty = getUserById(otherPartyId);
      const amount = `$${activity.amount?.toLocaleString() || '0'}`;
      const username = `@${otherParty?.username || 'user'}`;

      if (isBorrower) {
        title = `You made a ${amount} payment to ${username}`;
        icon = ArrowUpRight;
      } else {
        title = `Received ${amount} payment from ${username}`;
        icon = ArrowDownRight;
      }
      description = activity.date ? format(new Date(activity.date), 'MMM d, yyyy • h:mm a') : 'N/A';
      status = 'completed';
    }

    return { title, description, icon, status };
  };

  // Get display label for the current loan filter
  const getLoanFilterLabel = () => {
    const labels = {
      all: 'Loan Agreements',
      pending_sent: 'Sent Loan Offer',
      pending_received: 'Received Loan Offer',
      active: 'Loan Accepted',
      declined: 'Loan Declined',
      cancelled: 'Loan Cancellation',
      completed: 'Loan Completed',
      defaulted: 'Loan Defaulted',
    };
    return labels[filterStatus] || 'Loan Agreements';
  };

  // Get display label for the current payment filter
  const getPaymentFilterLabel = () => {
    const labels = {
      all: 'Payments',
      sent: 'Payment Sent',
      received: 'Payment Received',
    };
    return labels[filterPayment] || 'Payments';
  };

  return (
    <div className="min-h-screen p-3 md:p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
      <div className="max-w-4xl mx-auto space-y-7">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-5"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-left">
            Activity
          </h1>
        </motion.div>

        {/* Top Filter Box - "Activity Involving:" */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
            <CardContent className="p-5">
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                Activity Involving:
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    setFilterType('loan');
                    setFilterPayment('all');
                  }}
                  variant={filterType === 'loan' ? 'default' : 'outline'}
                  className={`flex-1 min-w-[100px] ${
                    filterType === 'loan'
                      ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Loan Agreement
                </Button>
                <Button
                  onClick={() => {
                    setFilterType('payment');
                    setFilterStatus('all');
                  }}
                  variant={filterType === 'payment' ? 'default' : 'outline'}
                  className={`flex-1 min-w-[100px] ${
                    filterType === 'payment'
                      ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Payments
                </Button>
                <Button
                  onClick={() => {
                    setFilterType('all');
                    setFilterStatus('all');
                    setFilterPayment('all');
                  }}
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  className={`flex-1 min-w-[100px] ${
                    filterType === 'all'
                      ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Both
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity List Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
            <CardContent className="p-5">
              {/* Header with label and conditional dropdown */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  {filterType === 'loan' ? 'Loan Activity' : filterType === 'payment' ? 'Payment Activity' : 'All Activity'}
                </p>

                {/* Loan Agreement dropdown - only shows when loan type selected */}
                {filterType === 'loan' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 gap-2">
                        <span>{getLoanFilterLabel()}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white">
                      <DropdownMenuItem onClick={() => setFilterStatus('all')} className={filterStatus === 'all' ? 'bg-slate-100' : ''}>
                        View All
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus('pending_sent')} className={filterStatus === 'pending_sent' ? 'bg-slate-100' : ''}>
                        Sent Loan Offer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus('pending_received')} className={filterStatus === 'pending_received' ? 'bg-slate-100' : ''}>
                        Received Loan Offer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus('active')} className={filterStatus === 'active' ? 'bg-slate-100' : ''}>
                        Loan Accepted
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus('declined')} className={filterStatus === 'declined' ? 'bg-slate-100' : ''}>
                        Loan Declined
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus('cancelled')} className={filterStatus === 'cancelled' ? 'bg-slate-100' : ''}>
                        Loan Cancellation
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterStatus('completed')} className={filterStatus === 'completed' ? 'bg-slate-100' : ''}>
                        Loan Completed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Payment dropdown - only shows when payment type selected */}
                {filterType === 'payment' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 gap-2">
                        <span>{getPaymentFilterLabel()}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 bg-white">
                      <DropdownMenuItem onClick={() => setFilterPayment('all')} className={filterPayment === 'all' ? 'bg-slate-100' : ''}>
                        View All
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterPayment('sent')} className={filterPayment === 'sent' ? 'bg-slate-100' : ''}>
                        Payment Sent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterPayment('received')} className={filterPayment === 'received' ? 'bg-slate-100' : ''}>
                        Payment Received
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Activity Items */}
              {allActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Activity className="w-10 h-10 opacity-40 mb-2" />
                  <p className="text-sm">No activity found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allActivities.map((activity, index) => {
                    const { title, description, icon: Icon, status } = getActivityInfo(activity);

                    return (
                      <motion.div
                        key={`${activity.type}-${activity.id}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                        className="rounded-xl p-3 md:p-4 flex items-center gap-3 group hover:opacity-90 transition-all duration-200"
                        style={{ backgroundColor: bgColors[index % 6] }}
                      >
                        {/* Circular Icon */}
                        <div className="w-9 h-9 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-[#0A1A10]" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#0A1A10] text-[14px] group-hover:text-[#00A86B] transition-colors truncate">
                            {title}
                          </p>
                          <p className="text-xs text-[#0A1A10]/60 mt-0.5">
                            {description}
                          </p>
                        </div>

                        {/* Status Badge */}
                        {status && statusConfig[status] && (() => {
                          const config = statusConfig[status];
                          const StatusIcon = config.icon;
                          return (
                            <div className={`${config.bg} rounded-xl px-4 py-2 flex items-center gap-1.5 flex-shrink-0`}>
                              <StatusIcon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                              <span className={`text-sm font-medium ${config.textColor} capitalize`}>{status}</span>
                            </div>
                          );
                        })()}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Activity Count */}
              {allActivities.length > 0 && (
                <div className="text-center text-xs text-slate-500 mt-4">
                  Showing {allActivities.length} {allActivities.length === 1 ? 'activity' : 'activities'}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

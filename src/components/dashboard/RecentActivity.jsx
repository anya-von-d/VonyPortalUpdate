import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Activity, ArrowUpRight, ArrowDownRight, Send, Check, X, Ban } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { SkeletonShimmer } from "@/components/ui/animations";

// Background colors that cycle through cards
const cardBgColors = ['#36CE8E', '#36CE8E', '#36CE8E'];
// Hover accent colors that cycle through cards
const hoverAccentColors = ['#00A86B', '#50C878', '#0D9B76', '#00BF7A'];

// Helper to parse date strings without timezone shifting
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

export default function RecentActivity({ loans, payments, isLoading, user, allUsers }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const safeLoans = Array.isArray(loans) ? loans : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];

  if (isLoading || !user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="rounded-lg p-5 max-w-[85%] mx-auto lg:max-w-none" style={{backgroundColor: '#F7FAF8'}}>
          <p className="text-xl font-bold text-slate-800 mb-4 tracking-tight font-serif">
            Activity
          </p>
          <div className="relative">
            <div className="max-h-[380px] overflow-y-auto space-y-1.5">
              {Array(3).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="rounded-md p-2.5 md:p-3"
                  style={{ backgroundColor: cardBgColors[i % 6] }}
                >
                  <SkeletonShimmer className="h-4 w-48 mb-2" />
                  <SkeletonShimmer className="h-3 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const getUserById = (userId) => {
    const foundUser = safeAllUsers.find(u => u && u.user_id === userId);
    if (foundUser) return foundUser;
    return {
      id: userId,
      username: 'user',
      full_name: 'Unknown User',
      profile_picture_url: null
    };
  };

  const myLoanIds = safeLoans.map(l => l && l.id).filter(Boolean);
  const myPayments = safePayments.filter(p => p && myLoanIds.includes(p.loan_id));

  const loanActivities = safeLoans.map(loan => ({ type: 'loan', ...loan, date: loan.created_at }));
  const paymentActivities = myPayments.map(payment => ({ type: 'payment', ...payment, date: payment.payment_date || payment.created_at }));

  const recentActivity = [...loanActivities, ...paymentActivities]
    .filter(activity => activity && activity.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  const getActivityInfo = (activity) => {
    if (!activity) return { title: "Activity", date: "", icon: Activity };

    let title = "Activity";
    let date = "";
    let icon = Activity;

    if (activity.type === 'loan') {
      const isLender = activity.lender_id === user.id;
      const otherPartyId = isLender ? activity.borrower_id : activity.lender_id;
      const otherParty = getUserById(otherPartyId);
      const amount = `$${activity.amount?.toLocaleString() || '0'}`;
      const username = `@${otherParty?.username || 'user'}`;
      const reason = activity.purpose || 'Reason';

      if (activity.status === 'pending' || !activity.status) {
        title = isLender ? `Sent ${amount} loan offer to ${username} for ${reason}` : `Received ${amount} loan offer from ${username} for ${reason}`;
        icon = isLender ? Send : ArrowDownRight;
      } else if (activity.status === 'active') {
        title = isLender ? `${username} accepted your ${amount} loan for ${reason}` : `You accepted ${amount} loan from ${username} for ${reason}`;
        icon = Check;
      } else if (activity.status === 'declined') {
        title = isLender ? `${username} declined your ${amount} loan for ${reason}` : `You declined ${amount} loan from ${username} for ${reason}`;
        icon = X;
      } else if (activity.status === 'cancelled') {
        title = isLender ? `You cancelled ${amount} loan offer to ${username} for ${reason}` : `${username} cancelled their ${amount} loan offer for ${reason}`;
        icon = Ban;
      } else if (activity.status === 'completed') {
        title = isLender ? `${username} fully repaid your ${amount} loan for ${reason}` : `You fully repaid ${amount} loan to ${username} for ${reason}`;
        icon = Check;
      } else {
        title = isLender ? `${amount} loan to ${username} for ${reason}` : `${amount} loan from ${username} for ${reason}`;
        icon = Activity;
      }

      date = activity.date ? format(parseLocalDate(activity.date), 'MMM d, yyyy') : 'N/A';
    }

    if (activity.type === 'payment') {
      const associatedLoan = safeLoans.find(l => l && l.id === activity.loan_id);
      if (!associatedLoan) return { title: "Payment", date: "", icon: Activity };

      const isBorrower = associatedLoan.borrower_id === user.id;
      const otherPartyId = isBorrower ? associatedLoan.lender_id : associatedLoan.borrower_id;
      const otherParty = getUserById(otherPartyId);
      const amount = `$${activity.amount?.toLocaleString() || '0'}`;
      const username = `@${otherParty?.username || 'user'}`;

      title = isBorrower ? `Made ${amount} payment to ${username}` : `Received ${amount} payment from ${username}`;
      date = activity.date ? format(parseLocalDate(activity.date), 'MMM d, yyyy') : 'N/A';
      icon = isBorrower ? ArrowUpRight : ArrowDownRight;
    }

    return { title, date, icon };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="rounded-lg p-5 max-w-[85%] mx-auto lg:max-w-none" style={{backgroundColor: '#F7FAF8'}}>
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xl font-bold text-slate-800 tracking-tight font-serif">
            Activity
          </p>
          <Link to={createPageUrl("RecentActivity")}>
            <Button variant="ghost" size="sm" className="text-[#00A86B] hover:text-[#0D9B76] hover:bg-transparent text-xs">
              View All
            </Button>
          </Link>
        </div>

        {/* Scrollable area */}
        <div className="relative">
          {/* Scrollable content - shows 3 items, scroll for more */}
          <div className="max-h-[220px] overflow-y-auto space-y-1.5">
            {recentActivity.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center py-8"
              >
                <p className="text-[#7A9A85] mb-4 font-sans text-sm">No recent activity</p>
                <Link to={createPageUrl("CreateLoan")}>
                  <Button className="bg-[#00A86B] hover:bg-[#0D9B76] text-white">
                    Get Started
                  </Button>
                </Link>
              </motion.div>
            ) : (
              recentActivity.map((activity, index) => {
                const { title, date, icon: Icon } = getActivityInfo(activity);
                const bgColor = cardBgColors[index % 6];
                const hoverColor = hoverAccentColors[index % 4];
                const isHovered = hoveredIndex === index;

                return (
                  <motion.div
                    key={`${activity.type}-${activity.id}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="rounded-md p-2 md:p-2.5 cursor-pointer transition-all duration-200 flex items-center gap-2.5"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* Circular Icon */}
                    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#0A1A10]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-4">
                      <p
                        className="font-sans text-[14px] font-semibold transition-colors duration-200 truncate"
                        style={{ color: isHovered ? hoverColor : '#0A1A10' }}
                      >
                        {title}
                      </p>
                      <p className="font-sans text-xs text-[#4A6B55] flex-shrink-0">
                        {date}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

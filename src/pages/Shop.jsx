import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, Wallet, Percent, ChevronRight,
  Check, DollarSign, Zap, Clock, Award, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

export default function Shop() {
  const [activeTab, setActiveTab] = useState('cards');

  const creditCards = [
    {
      name: "Vony Starter Card",
      issuer: "Vony Financial",
      apr: "19.99% - 24.99%",
      annualFee: "$0",
      creditLimit: "$500 - $2,000",
      rewards: "1% cash back on all purchases",
      badge: "Best for Building Credit",
      features: [
        "No annual fee",
        "Free credit score monitoring",
        "Auto credit limit increases",
        "Mobile app access"
      ]
    },
    {
      name: "Vony Rewards Card",
      issuer: "Vony Financial",
      apr: "15.99% - 21.99%",
      annualFee: "$95",
      creditLimit: "$2,000 - $10,000",
      rewards: "3% dining, 2% groceries, 1% all else",
      badge: "Most Popular",
      features: [
        "Welcome bonus: $200",
        "No foreign transaction fees",
        "Extended warranty protection",
        "Travel insurance included"
      ]
    },
    {
      name: "Vony Premium Card",
      issuer: "Vony Financial",
      apr: "14.99% - 19.99%",
      annualFee: "$250",
      creditLimit: "$10,000 - $50,000",
      rewards: "5% travel, 3% dining, 2% all else",
      badge: "Premium",
      features: [
        "Welcome bonus: $500",
        "Airport lounge access",
        "Concierge service",
        "Premium travel insurance"
      ]
    }
  ];

  const loans = [
    {
      name: "Personal Loan",
      type: "Unsecured",
      apr: "6.99% - 24.99%",
      amount: "$1,000 - $50,000",
      term: "12 - 60 months",
      badge: "Most Flexible",
      icon: Wallet,
      description: "Flexible funding for any purpose - debt consolidation, home improvement, or major purchases.",
      features: [
        "No collateral required",
        "Fixed monthly payments",
        "Funds in 1-3 business days",
        "No prepayment penalties"
      ]
    },
    {
      name: "Auto Loan",
      type: "Secured",
      apr: "4.99% - 14.99%",
      amount: "$5,000 - $100,000",
      term: "24 - 84 months",
      badge: "Lowest Rates",
      icon: TrendingUp,
      description: "Finance your next vehicle with competitive rates and flexible terms.",
      features: [
        "New and used vehicles",
        "Refinancing available",
        "GAP coverage options",
        "Pre-approval in minutes"
      ]
    },
    {
      name: "Emergency Loan",
      type: "Unsecured",
      apr: "9.99% - 29.99%",
      amount: "$500 - $10,000",
      term: "3 - 24 months",
      badge: "Fast Approval",
      icon: Zap,
      description: "Quick funding for unexpected expenses when you need it most.",
      features: [
        "Same-day approval",
        "Funds within 24 hours",
        "Minimal documentation",
        "Flexible repayment"
      ]
    },
    {
      name: "Student Loan",
      type: "Unsecured",
      apr: "4.49% - 12.99%",
      amount: "$1,000 - $150,000",
      term: "60 - 180 months",
      badge: "Education",
      icon: Award,
      description: "Invest in your future with affordable education financing.",
      features: [
        "Deferred payments while in school",
        "No origination fees",
        "Cosigner release available",
        "Income-driven repayment"
      ]
    }
  ];

  const cardColors = ['#96FFD0', '#AAFFA3', '#74FF71', '#30FFA8', '#6EE8A2'];
  const subBoxColors = ['#AAFFA3', '#30FFA8', '#96FFD0', '#74FF71', '#6EE8A2'];
  const loanCardColors = ['#30FFA8', '#6EE8A2', '#AAFFA3'];
  const loanSubBoxColors = ['#6EE8A2', '#96FFD0', '#74FF71'];

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
            Financial Products
          </h1>
        </motion.div>

        {/* Coming Soon Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: '#83F384' }}>
            <p className="text-[11px] text-[#0A1A10] uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              Loan and Credit Card Offers Coming Soon
            </p>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            onClick={() => setActiveTab('cards')}
            variant={activeTab === 'cards' ? 'default' : 'outline'}
            className={`whitespace-nowrap rounded-xl ${
              activeTab === 'cards'
                ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                : 'bg-white border-0 text-slate-600 hover:bg-[#DBFFEB]'
            }`}
          >
            Credit Cards
          </Button>
          <Button
            onClick={() => setActiveTab('loans')}
            variant={activeTab === 'loans' ? 'default' : 'outline'}
            className={`whitespace-nowrap rounded-xl ${
              activeTab === 'loans'
                ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                : 'bg-white border-0 text-slate-600 hover:bg-[#DBFFEB]'
            }`}
          >
            Loans
          </Button>
        </div>

        {/* Credit Cards Section */}
        {activeTab === 'cards' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {creditCards.map((card, index) => (
              <motion.div
                key={card.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#DBFFEB' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-[#0A1A10]" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{card.name}</p>
                      <p className="text-xs text-slate-500">{card.issuer}</p>
                    </div>
                  </div>
                  <Badge className="bg-[#00A86B]/10 text-[#00A86B] border-0 text-xs">
                    {card.badge}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'APR', value: card.apr },
                    { label: 'Annual Fee', value: card.annualFee },
                    { label: 'Credit Limit', value: card.creditLimit },
                    { label: 'Rewards', value: card.rewards }
                  ].map((stat, statIdx) => (
                    <div key={stat.label} className="rounded-xl p-3" style={{ backgroundColor: subBoxColors[(index + statIdx + 1) % 5] }}>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{stat.label}</p>
                      <p className="font-semibold text-slate-800 text-sm">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {card.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2 py-1 rounded-lg">
                      <Check className="w-3 h-3 text-[#00A86B]" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button className="bg-[#00A86B] hover:bg-[#0D9B76] text-white rounded-xl">
                  Apply Now
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Loans Section */}
        {activeTab === 'loans' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-4"
          >
            {loans.map((loan, index) => (
              <motion.div
                key={loan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#DBFFEB' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <loan.icon className="w-5 h-5 text-[#0A1A10]" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{loan.name}</p>
                      <p className="text-xs text-slate-500">{loan.type} Loan</p>
                    </div>
                  </div>
                  <Badge className="bg-[#00A86B]/10 text-[#00A86B] border-0 text-xs">
                    {loan.badge}
                  </Badge>
                </div>

                <p className="text-sm text-slate-600 mb-4">{loan.description}</p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'APR', value: loan.apr },
                    { label: 'Amount', value: loan.amount },
                    { label: 'Term', value: loan.term }
                  ].map((stat, statIdx) => (
                    <div key={stat.label} className="rounded-xl p-2 text-center" style={{ backgroundColor: loanSubBoxColors[(index + statIdx + 1) % 3] }}>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{stat.label}</p>
                      <p className="font-semibold text-slate-800 text-xs">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {loan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2 py-1 rounded-lg">
                      <Check className="w-3 h-3 text-[#00A86B]" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button className="w-full bg-[#00A86B] hover:bg-[#0D9B76] text-white rounded-xl">
                  Check Your Rate
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-[#DBEEE3] px-4"
        >
          <p>
            All rates and terms are subject to credit approval. APRs shown are estimates and may vary based on creditworthiness.
            This is for demonstration purposes only. Vony Portal does not issue credit cards or loans directly.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

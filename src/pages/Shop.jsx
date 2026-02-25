import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, Wallet, Building2, Percent, Star, ChevronRight,
  Check, DollarSign, Shield, Zap, Clock, Award, TrendingUp
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
      color: "from-slate-700 to-slate-900",
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
      color: "from-[#35B276] to-[#2d9561]",
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
      color: "from-amber-500 to-amber-700",
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
      color: "bg-blue-100 text-blue-600",
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
      color: "bg-green-100 text-green-600",
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
      color: "bg-amber-100 text-amber-600",
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
      color: "bg-purple-100 text-purple-600",
      description: "Invest in your future with affordable education financing.",
      features: [
        "Deferred payments while in school",
        "No origination fees",
        "Cosigner release available",
        "Income-driven repayment"
      ]
    }
  ];

  return (
    <div className="min-h-screen p-3 md:p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-4 text-center"
        >
          <h1 className="text-3xl md:text-5xl font-bold text-slate-800 mb-3 tracking-tight">
            Financial Products
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-xl mx-auto">
            Credit cards and loans tailored to your needs
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center gap-2"
        >
          <Button
            onClick={() => setActiveTab('cards')}
            variant={activeTab === 'cards' ? 'default' : 'outline'}
            className={`flex items-center gap-2 ${
              activeTab === 'cards'
                ? 'bg-[#35B276] hover:bg-[#2d9a65] text-white'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Credit Cards
          </Button>
          <Button
            onClick={() => setActiveTab('loans')}
            variant={activeTab === 'loans' ? 'default' : 'outline'}
            className={`flex items-center gap-2 ${
              activeTab === 'loans'
                ? 'bg-[#35B276] hover:bg-[#2d9a65] text-white'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Loans
          </Button>
        </motion.div>

        {/* Credit Cards Section */}
        {activeTab === 'cards' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* Info Banner */}
            <Card className="bg-gradient-to-r from-[#35B276] to-[#2d9561] text-white border-0">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Check your rate without impacting your credit</h3>
                  <p className="text-sm opacity-90">Pre-qualify in minutes with a soft credit check</p>
                </div>
              </CardContent>
            </Card>

            {/* Credit Card List */}
            <div className="space-y-4">
              {creditCards.map((card, index) => (
                <motion.div
                  key={card.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {/* Card Visual */}
                        <div className={`bg-gradient-to-br ${card.color} p-6 md:w-64 flex-shrink-0`}>
                          <div className="text-white">
                            <div className="flex justify-between items-start mb-8">
                              <CreditCard className="w-8 h-8 opacity-80" />
                              {card.badge && (
                                <Badge className="bg-white/20 text-white border-0 text-xs">
                                  {card.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-lg font-bold">{card.name}</p>
                            <p className="text-sm opacity-80">{card.issuer}</p>
                          </div>
                        </div>

                        {/* Card Details */}
                        <div className="flex-1 p-4 md:p-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-slate-500">APR</p>
                              <p className="font-semibold text-slate-800">{card.apr}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Annual Fee</p>
                              <p className="font-semibold text-slate-800">{card.annualFee}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Credit Limit</p>
                              <p className="font-semibold text-slate-800">{card.creditLimit}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Rewards</p>
                              <p className="font-semibold text-slate-800 text-sm">{card.rewards}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {card.features.map((feature, i) => (
                              <div key={i} className="flex items-center gap-1 text-xs text-slate-600">
                                <Check className="w-3 h-3 text-[#35B276]" />
                                {feature}
                              </div>
                            ))}
                          </div>

                          <Button className="bg-[#35B276] hover:bg-[#2d9a65]">
                            Apply Now
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loans Section */}
        {activeTab === 'loans' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* Info Banner */}
            <Card className="bg-gradient-to-r from-[#35B276] to-[#2d9561] text-white border-0">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Get funded as fast as same day</h3>
                  <p className="text-sm opacity-90">Quick application, fast approval, and rapid funding</p>
                </div>
              </CardContent>
            </Card>

            {/* Loan List */}
            <div className="grid md:grid-cols-2 gap-4">
              {loans.map((loan, index) => (
                <motion.div
                  key={loan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60 h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${loan.color} flex items-center justify-center`}>
                            <loan.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{loan.name}</CardTitle>
                            <p className="text-xs text-slate-500">{loan.type} Loan</p>
                          </div>
                        </div>
                        <Badge className="bg-[#35B276]/10 text-[#35B276] border-0 text-xs">
                          {loan.badge}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600">{loan.description}</p>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-[10px] text-slate-500">APR</p>
                          <p className="text-xs font-semibold text-slate-800">{loan.apr}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-[10px] text-slate-500">Amount</p>
                          <p className="text-xs font-semibold text-slate-800">{loan.amount}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-[10px] text-slate-500">Term</p>
                          <p className="text-xs font-semibold text-slate-800">{loan.term}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {loan.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            <Check className="w-3 h-3 text-[#35B276] flex-shrink-0" />
                            {feature}
                          </div>
                        ))}
                      </div>

                      <Button className="w-full bg-[#35B276] hover:bg-[#2d9a65]">
                        Check Your Rate
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-slate-400 px-4"
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

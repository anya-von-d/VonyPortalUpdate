import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, CreditCard, Send } from "lucide-react";
import { motion } from "framer-motion";

const actions = [
  {
    title: "Create Loan Offer",
    description: "Lend money to others",
    icon: Plus,
    color: "green",
    url: "CreateLoan"
  },
  {
    title: "My Loans",
    description: "Manage active loans",
    icon: CreditCard,
    color: "purple",
    url: "MyLoans"
  },
  {
    title: "My Loan Offers",
    description: "View sent offers",
    icon: Send,
    color: "orange",
    url: "MyLoanOffers"
  }
];

const colorClasses = {
  green: "bg-[#35B276] opacity-100 hover:opacity-90 shadow-[#35B276]/20",
  blue: "bg-[#35B276] opacity-100 hover:opacity-90 shadow-[#35B276]/20", 
  purple: "bg-[#35B276] opacity-100 hover:opacity-90 shadow-[#35B276]/20",
  orange: "bg-[#35B276] opacity-100 hover:opacity-90 shadow-[#35B276]/20"
};

export default function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="bg-[#DBFFEB] backdrop-blur-sm border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-800">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-3">
          <div className="space-y-3">
            {actions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <Link to={createPageUrl(action.url)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto p-4 hover:bg-slate-50/80 group transition-all duration-200 rounded-xl border border-transparent hover:border-slate-200/60"
                  >
                    <motion.div
                      className={`p-2.5 rounded-xl ${colorClasses[action.color]} shadow-lg mr-4`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <action.icon className="w-4 h-4 text-[#F3F0EC] opacity-90" />
                    </motion.div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-800 group-hover:text-slate-900">
                        {action.title}
                      </p>
                      <p className="text-sm text-slate-500 group-hover:text-slate-600">
                        {action.description}
                      </p>
                    </div>
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
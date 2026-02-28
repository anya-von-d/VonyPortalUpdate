import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, CreditCard, FileText } from "lucide-react";
import { motion } from "framer-motion";

// Background colors that cycle through cards
const cardBgColors = ['#D0ED6F', '#83F384', '#6EE8B5'];
// Hover accent colors that cycle through cards
const hoverAccentColors = ['#00A86B', '#50C878', '#0D9B76', '#00BF7A'];

const actions = [
  {
    title: "Create Loan Offer",
    description: "Lend money to others",
    icon: Plus,
    url: "CreateLoan"
  },
  {
    title: "My Loans",
    description: "Manage active loans",
    icon: CreditCard,
    url: "MyLoans"
  },
  {
    title: "Document Center",
    description: "View loan agreements",
    icon: FileText,
    url: "LoanAgreements"
  }
];

export default function QuickActions() {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="bg-[#DBFFEB] rounded-2xl p-6 md:p-8 lg:p-10 max-w-[85%] mx-auto lg:max-w-none">
        {/* Title */}
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7A9A85] mb-5">
          Quick Actions
        </p>

        {/* Cards */}
        <div className="space-y-3">
          {actions.map((action, index) => {
            const bgColor = cardBgColors[index % 3];
            const hoverColor = hoverAccentColors[index % 4];
            const isHovered = hoveredIndex === index;
            const Icon = action.icon;

            return (
              <Link key={action.title} to={createPageUrl(action.url)}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="rounded-xl p-4 md:p-5 cursor-pointer transition-all duration-200 flex items-start gap-4"
                  style={{ backgroundColor: bgColor }}
                >
                  {/* Circular Icon */}
                  <div className="w-10 h-10 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#0A1A10]" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-sans text-[15px] font-semibold transition-colors duration-200"
                      style={{ color: isHovered ? hoverColor : '#0A1A10' }}
                    >
                      {action.title}
                    </p>
                    <p className="font-sans text-sm text-[#4A6B55] leading-relaxed mt-1">
                      {action.description}
                    </p>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

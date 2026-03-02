import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Bell, FileText } from "lucide-react";
import { motion } from "framer-motion";

// Hover accent colors that cycle through cards
const hoverAccentColors = ['#00A86B', '#50C878', '#0D9B76', '#00BF7A'];

const actions = [
  {
    title: "Create Loan Offer",
    icon: Plus,
    url: "Lending"
  },
  {
    title: "View Requests",
    icon: Bell,
    url: "Requests"
  },
  {
    title: "View Documents",
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
      <div className="bg-white rounded-xl p-5 max-w-[85%] mx-auto lg:max-w-none">
        {/* Title */}
        <p className="text-xl font-bold text-slate-800 mb-4 tracking-tight font-serif">
          Quick Actions
        </p>

        {/* Cards */}
        <div className="flex flex-col gap-3">
          {actions.map((action, index) => {
            const hoverColor = hoverAccentColors[index % 4];
            const isHovered = hoveredIndex === index;
            const Icon = action.icon;
            const cardBgColors = ['#83F384', '#83F384', '#83F384'];

            return (
              <Link key={action.title} to={createPageUrl(action.url)}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="rounded-lg p-2 md:p-2.5 cursor-pointer transition-all duration-200 flex items-center gap-2.5"
                  style={{ backgroundColor: cardBgColors[index % 6] }}
                >
                  {/* Circular Icon */}
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-[#0A1A10]" />
                  </div>

                  {/* Content - Title only */}
                  <p
                    className="font-sans text-[14px] font-semibold transition-colors duration-200"
                    style={{ color: isHovered ? hoverColor : '#0A1A10' }}
                  >
                    {action.title}
                  </p>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

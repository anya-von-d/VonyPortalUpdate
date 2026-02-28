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
      <div className="bg-[#6EE8B5] rounded-2xl p-6 md:p-8 lg:p-10 max-w-[85%] mx-auto lg:max-w-none">
        {/* Title */}
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#0A1A10] mb-5">
          Quick Actions
        </p>

        {/* Cards */}
        <div className="space-y-3">
          {actions.map((action, index) => {
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
                  className="rounded-xl p-3 md:p-4 cursor-pointer transition-all duration-200 flex items-center gap-3 bg-[#C2FFDC]"
                >
                  {/* Circular Icon */}
                  <div className="w-9 h-9 rounded-full bg-[#83F384] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#DBFFEB]" />
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

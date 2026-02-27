import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const leftNavItems = [
  {
    title: "Home",
    url: createPageUrl("Home"),
  },
  {
    title: "Lending",
    url: createPageUrl("Lending"),
  },
];

const rightNavItems = [
  {
    title: "Borrowing",
    url: createPageUrl("Borrowing"),
  },
];

const moreMenuItems = [
  {
    title: "Agreements",
    url: createPageUrl("LoanAgreements"),
  },
  {
    title: "Activity",
    url: createPageUrl("RecentActivity"),
  },
  {
    title: "Learn (Coming Soon)",
    url: createPageUrl("Learn"),
  },
  {
    title: "Shop (Coming Soon)",
    url: createPageUrl("Shop"),
  },
  {
    title: "Profile",
    url: createPageUrl("Profile"),
  },
];

const allNavItems = [...leftNavItems, ...rightNavItems, ...moreMenuItems];

export default function TopNav({ location }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileNavClick = (url) => {
    setMobileMenuOpen(false);
    // Small delay before scrolling to allow menu to close
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  };

  return (
    <>
      {/* Fixed Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-white shadow-sm shadow-black/5">
        <div className="h-full px-6 md:px-10 flex items-center justify-between">

          {/* Mobile: Hamburger Menu (Left) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -ml-2 text-[#0A1A10]"
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {mobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-[22px] h-[22px]" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-[22px] h-[22px]" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Desktop: Left Nav Links */}
          <div className="hidden md:flex items-center gap-10">
            {leftNavItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`font-sans text-sm font-medium transition-colors duration-200 ${
                  location.pathname === item.url
                    ? "text-[#0A1A10]"
                    : "text-[#4A6B55] hover:text-[#0A1A10]"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </div>

          {/* Center: Logo - Absolutely centered */}
          <Link
            to={createPageUrl("Home")}
            className="absolute left-1/2 -translate-x-1/2 font-serif italic text-3xl text-[#0A1A10] tracking-wide"
          >
            Vony
          </Link>

          {/* Desktop: Right Nav Links + More */}
          <div className="hidden md:flex items-center gap-10">
            {rightNavItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`font-sans text-sm font-medium transition-colors duration-200 ${
                  location.pathname === item.url
                    ? "text-[#0A1A10]"
                    : "text-[#4A6B55] hover:text-[#0A1A10]"
                }`}
              >
                {item.title}
              </Link>
            ))}

            {/* More Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="font-sans text-sm font-medium text-[#4A6B55] hover:text-[#0A1A10] transition-colors duration-200">
                  More
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-100 shadow-lg">
                {moreMenuItems.map((item) => (
                  <DropdownMenuItem key={item.title} asChild>
                    <Link
                      to={item.url}
                      className={`cursor-pointer ${
                        location.pathname === item.url
                          ? "text-[#0A1A10]"
                          : "text-[#4A6B55] hover:text-[#0A1A10]"
                      }`}
                    >
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile: Empty spacer for balance */}
          <div className="md:hidden w-10"></div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/20"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Full Screen Menu */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed top-14 left-0 right-0 bottom-0 z-40 bg-white overflow-y-auto"
            >
              <nav className="px-6 py-6 space-y-1">
                {allNavItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => handleMobileNavClick(item.url)}
                    className={`block px-4 py-3 rounded-lg font-sans text-base font-medium transition-colors duration-200 ${
                      location.pathname === item.url
                        ? "text-[#0A1A10] bg-[#E8FCF0]"
                        : "text-[#4A6B55] hover:text-[#0A1A10] hover:bg-gray-50"
                    }`}
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer to prevent content from going under fixed nav */}
      <div className="h-14"></div>
    </>
  );
}

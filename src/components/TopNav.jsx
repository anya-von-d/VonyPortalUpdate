import React, { useState, useEffect } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleNavClick = (url) => {
    setMenuOpen(false);
    // Small delay before scrolling to allow menu to close
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  };

  // Stagger animation variants for menu items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.03,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <>
      {/* Fixed Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-white shadow-sm shadow-black/5">
        <div className="h-full px-6 md:px-10 flex items-center justify-between">

          {/* Hamburger Menu Button - Always Visible */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 flex items-center justify-center text-[#0A1A10]"
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {menuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-[22px] h-[22px]" strokeWidth={1.5} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-[22px] h-[22px]" strokeWidth={1.5} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Mobile: Centered Logo */}
          <Link
            to={createPageUrl("Home")}
            className="md:hidden absolute left-1/2 -translate-x-1/2 font-display italic text-3xl text-[#0A1A10] tracking-wide"
          >
            Vony
          </Link>

          {/* Desktop: Centered Nav Group (Links + Logo) */}
          <div className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
            {/* Left Nav Links */}
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

            {/* Center: Logo with extra horizontal margin */}
            <Link
              to={createPageUrl("Home")}
              className="font-display italic text-3xl text-[#0A1A10] tracking-wide mx-2"
            >
              Vony
            </Link>

            {/* Right Nav Links */}
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

            {/* Agreements Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="font-sans text-sm font-medium text-[#4A6B55] hover:text-[#0A1A10] transition-colors duration-200">
                  Agreements
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

          {/* My Profile Button (Right) */}
          <Link
            to={createPageUrl("Profile")}
            className="px-4 md:px-5 py-1.5 md:py-2 bg-[#36CE8E] hover:bg-[#36CE8E]/85 text-[#0A1A10] font-sans text-sm font-semibold rounded-lg shadow-md shadow-black/10 transition-all duration-200"
          >
            My Profile
          </Link>
        </div>
      </nav>

      {/* Full Screen Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-[#DBEEE3] flex flex-col"
            style={{ top: '56px' }}
          >
            {/* Navigation Links */}
            <motion.nav
              className="flex-1 flex flex-col items-center justify-center px-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {allNavItems.map((item) => (
                <motion.div key={item.title} variants={itemVariants}>
                  <Link
                    to={item.url}
                    onClick={() => handleNavClick(item.url)}
                    className={`block py-3 md:py-4 font-display italic text-5xl md:text-6xl lg:text-7xl tracking-wide transition-colors duration-200 ${
                      location.pathname === item.url
                        ? "text-[#0A1A10]"
                        : "text-[#4A6B55] hover:text-[#0A1A10]"
                    }`}
                  >
                    {item.title}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="py-8 text-center"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#4A6B55]">
                Vony · Lending Made Simple
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer to prevent content from going under fixed nav */}
      <div className="h-14"></div>
    </>
  );
}

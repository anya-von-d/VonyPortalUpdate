import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Top bar items (medium green #00A86B bar - secondary links + Vony logo)
const topBarItems = [
  {
    title: "Notifications",
    url: createPageUrl("Requests"),
  },
  {
    title: "Friends",
    url: createPageUrl("Friends"),
  },
  {
    title: "My Loan Documents",
    url: createPageUrl("LoanAgreements"),
  },
  {
    title: "Recent Activity",
    url: createPageUrl("RecentActivity"),
  },
  {
    title: "Profile",
    url: createPageUrl("Profile"),
  },
];

// Bottom bar items (left of logo)
const bottomLeftItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Home"),
  },
  {
    title: "Lending",
    url: createPageUrl("Lending"),
  },
];

// Bottom bar items (right of logo)
const bottomRightItems = [
  {
    title: "Borrowing",
    url: createPageUrl("Borrowing"),
  },
  {
    title: "Create Loan",
    url: createPageUrl("CreateOffer"),
  },
];

const allNavItems = [...bottomLeftItems, ...bottomRightItems, ...topBarItems];

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
      {/* Fixed Double Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 shadow-sm shadow-black/5">
        {/* Top Bar - Very Dark Green (#0F2B1F) secondary navigation with Vony logo */}
        <div className="h-10" style={{backgroundColor: '#0F2B1F'}}>
          <div className="h-full px-4 sm:px-8 md:px-24 lg:px-36 mx-auto flex items-center justify-between">
            {/* Hamburger Menu Button - Mobile only */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-10 h-10 -ml-1 flex items-center justify-center text-white active:bg-white/10 rounded-lg transition-colors"
              aria-label="Toggle menu"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              {menuOpen ? (
                <X className="w-[22px] h-[22px]" strokeWidth={2} />
              ) : (
                <Menu className="w-[22px] h-[22px]" strokeWidth={2} />
              )}
            </button>

            {/* Desktop: Vony logo left-aligned + Top bar links right-aligned */}
            <Link
              to={createPageUrl("Home")}
              onClick={() => handleNavClick(createPageUrl("Home"))}
              className="hidden md:block font-display italic text-3xl text-white tracking-wide"
            >
              Vony
            </Link>

            <div className="hidden md:flex items-center gap-8 ml-auto">
              {topBarItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => handleNavClick(item.url)}
                  className={`font-sans text-xs font-medium transition-colors duration-200 ${
                    location.pathname === item.url
                      ? "text-white font-bold"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {item.title}
                </Link>
              ))}
            </div>

            {/* Mobile: Logo on top bar */}
            <Link
              to={createPageUrl("Home")}
              onClick={() => handleNavClick(createPageUrl("Home"))}
              className="md:hidden absolute left-1/2 -translate-x-1/2 font-display italic text-2xl text-white tracking-wide"
            >
              Vony
            </Link>

            {/* Mobile: Profile button */}
            <Link
              to={createPageUrl("Profile")}
              onClick={() => handleNavClick(createPageUrl("Profile"))}
              className="md:hidden px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-sans text-xs font-semibold rounded-md transition-all duration-200"
            >
              Profile
            </Link>
          </div>
        </div>

        {/* Bottom Bar - Bright Green (#6AD478) primary navigation, left-aligned */}
        <div className={`h-12 ${menuOpen ? 'hidden md:block' : ''}`} style={{backgroundColor: '#6AD478'}}>
          <div className="h-full px-4 sm:px-8 md:px-24 lg:px-36 mx-auto flex items-center justify-start">
            {/* Mobile: Main nav links left-aligned */}
            <div className="flex md:hidden items-center gap-6">
              {[...bottomLeftItems, ...bottomRightItems].map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => handleNavClick(item.url)}
                  className={`font-sans text-sm font-medium transition-colors duration-200 ${
                    location.pathname === item.url
                      ? "text-[#1C4332]"
                      : "text-[#1C4332]/50 hover:text-[#1C4332]"
                  }`}
                >
                  {item.title}
                </Link>
              ))}
            </div>

            {/* Desktop: Left-aligned Nav Links */}
            <div className="hidden md:flex items-center gap-10">
              {[...bottomLeftItems, ...bottomRightItems].map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => handleNavClick(item.url)}
                  className={`font-sans text-sm font-semibold transition-colors duration-200 ${
                    location.pathname === item.url
                      ? "text-[#1C4332]"
                      : "text-[#1C4332]/50 hover:text-[#1C4332]"
                  }`}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Full Screen Menu Overlay - Mobile */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 flex flex-col md:hidden"
            style={{ top: '40px', backgroundColor: '#0F2B1F' }}
            onClick={(e) => {
              // Close menu when tapping the background (not a link)
              if (e.target === e.currentTarget) setMenuOpen(false);
            }}
          >
            {/* Navigation Links */}
            <motion.nav
              className="flex-1 flex flex-col items-center justify-center px-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex flex-col items-center w-full">
                {allNavItems.map((item) => (
                  <motion.div key={item.title} variants={itemVariants} className="text-center">
                    <Link
                      to={item.url}
                      onClick={() => handleNavClick(item.url)}
                      className={`block py-2 text-2xl md:text-3xl font-bold tracking-tight transition-colors duration-200 ${
                        location.pathname === item.url
                          ? "text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {item.title}
                    </Link>
                    {item.comingSoon && (
                      <p className="text-xs text-white/40 -mt-1 mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                        Coming Soon
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.nav>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="py-6 text-center"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
                Vony · Lending Made Simple
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer to prevent content from going under fixed nav (10 + 12 = 22 = h-[88px]) */}
      <div className="h-[88px]"></div>
    </>
  );
}

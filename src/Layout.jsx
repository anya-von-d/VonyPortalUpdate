import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { motion, AnimatePresence } from "framer-motion";

// Check if running as native app
const isNativeApp = () => {
  try {
    if (typeof window !== 'undefined' && window.Capacitor) {
      return window.Capacitor.isNativePlatform();
    }
    return false;
  } catch {
    return false;
  }
};

export default function Layout({ children }) {
  const location = useLocation();
  const { userProfile, isLoadingAuth, refreshProfile } = useAuth();

  // Configure status bar and keyboard for native app
  useEffect(() => {
    if (isNativeApp()) {
      try {
        StatusBar.setStyle({ style: Style.Light });
        StatusBar.setBackgroundColor({ color: '#F5F4F0' });
      } catch (e) {
        console.log('StatusBar config error:', e);
      }

      try {
        Keyboard.setAccessoryBarVisible({ isVisible: true });
      } catch (e) {
        console.log('Keyboard config error:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Listen for theme changes and profile updates from Profile page
    const handleProfileRefresh = () => {
      refreshProfile();
    };
    window.addEventListener('themeChanged', handleProfileRefresh);
    window.addEventListener('profileUpdated', handleProfileRefresh);

    return () => {
      window.removeEventListener('themeChanged', handleProfileRefresh);
      window.removeEventListener('profileUpdated', handleProfileRefresh);
    };
  }, []);

  const user = userProfile;

  // Use user preference or default to morning
  const theme = user?.theme_preference || 'morning';

  // Updated theme colors to match RebrandMainWebsite
  const themeColors = {
    morning: {
      cssVars: {
        '--theme-primary': '3 172 234',
        '--theme-primary-light': '224 246 254',
        '--theme-primary-dark': '2 138 187',
        '--theme-bg-from': '245 244 240',
        '--theme-bg-to': '245 244 240',
        '--theme-card-bg': '255 255 255',
        '--theme-border': '3 172 234 / 0.2'
      }
    },
    afternoon: {
      cssVars: {
        '--theme-primary': '3 172 234',
        '--theme-primary-light': '224 246 254',
        '--theme-primary-dark': '2 138 187',
        '--theme-bg-from': '245 244 240',
        '--theme-bg-to': '245 244 240',
        '--theme-card-bg': '255 255 255',
        '--theme-border': '3 172 234 / 0.2'
      }
    }
  };

  const colors = themeColors[theme] || themeColors['morning'];

  // Apply CSS variables to root
  React.useEffect(() => {
    Object.entries(colors.cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [theme, location.pathname]);

  const isHomePage = location.pathname === '/' || location.pathname === '/home';
  const isDashboardStyle = isHomePage || location.pathname === '/Upcoming' || location.pathname === '/upcoming' || location.pathname === '/Borrowing' || location.pathname === '/borrowing' || location.pathname === '/RecentActivity' || location.pathname === '/recentactivity' || location.pathname === '/Lending' || location.pathname === '/lending' || location.pathname === '/CreateOffer' || location.pathname === '/createoffer' || location.pathname === '/LoanAgreements' || location.pathname === '/loanagreements' || location.pathname === '/Friends' || location.pathname === '/friends' || location.pathname === '/RecordPayment' || location.pathname === '/recordpayment' || location.pathname === '/YourLoans' || location.pathname === '/yourloans' || location.pathname === '/Requests' || location.pathname === '/requests' || location.pathname === '/Profile' || location.pathname === '/profile' || location.pathname === '/ComingSoon' || location.pathname === '/comingsoon' || location.pathname === '/LoanHelp' || location.pathname === '/loanhelp';

  return (
    <div className="min-h-screen flex flex-col w-full safe-area-inset-top safe-area-inset-bottom" style={isDashboardStyle ? { background: 'transparent' } : { background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))` }}>

      {/* TopNav handles its own fixed positioning and mobile menu — hidden on dashboard-style pages */}
      {user && !isDashboardStyle && <TopNav location={location} />}

      {/* Main content container */}
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ minHeight: '100%' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer — hidden on dashboard-style pages (they render their own) */}
      {user && !isDashboardStyle && <Footer />}
    </div>
  );
}

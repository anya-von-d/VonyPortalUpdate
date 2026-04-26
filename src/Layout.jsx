import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { motion, AnimatePresence } from "framer-motion";

// Static grain SVG data URIs — computed once at module load
const GRAIN_FINE = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")`;
const GRAIN_FIBRE = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><filter id="f"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.96  0 0 0 0 0.94  0 0 0 0 0.90  0 0 0 0.35 0"/></filter><rect width="100%" height="100%" filter="url(#f)"/></svg>')}")`;

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
  const isDashboardStyle = isHomePage || location.pathname === '/Upcoming' || location.pathname === '/upcoming' || location.pathname === '/Borrowing' || location.pathname === '/borrowing' || location.pathname === '/RecentActivity' || location.pathname === '/recentactivity' || location.pathname === '/Lending' || location.pathname === '/lending' || location.pathname === '/CreateOffer' || location.pathname === '/createoffer' || location.pathname === '/LoanAgreements' || location.pathname === '/loanagreements' || location.pathname === '/RecordPayment' || location.pathname === '/recordpayment' || location.pathname === '/YourLoans' || location.pathname === '/yourloans' || location.pathname === '/Profile' || location.pathname === '/profile' || location.pathname === '/ComingSoon' || location.pathname === '/comingsoon' || location.pathname === '/LoanHelp' || location.pathname === '/loanhelp';

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col w-full safe-area-inset-top safe-area-inset-bottom" style={{ background: 'transparent' }}>

      {/* Fine grain overlay — sits above all content, pointer-events off */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 15, backgroundImage: GRAIN_FINE, backgroundSize: '180px 180px', mixBlendMode: 'multiply', opacity: 0.10 }} />
      {/* Coarse fibre overlay — adds pulp/texture depth */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 15, backgroundImage: GRAIN_FIBRE, backgroundSize: '600px 600px', mixBlendMode: 'multiply', opacity: 0.20 }} />

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

    </div>
  );
}

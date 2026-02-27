import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User as AppUser } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import TopNav from "@/components/TopNav";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    title: "Home",
    url: createPageUrl("Home"),
  },
  {
    title: "Lending",
    url: createPageUrl("Lending"),
  },
  {
    title: "Borrowing",
    url: createPageUrl("Borrowing"),
  },
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

export default function Layout({ children }) {
  const location = useLocation();
  const { userProfile, isLoadingAuth, refreshProfile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Listen for theme changes from Profile page
    const handleThemeChange = () => {
      refreshProfile();
    };
    window.addEventListener('themeChanged', handleThemeChange);

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const user = userProfile;
  const isLoading = isLoadingAuth;

  // Use user preference or default to morning
  const theme = user?.theme_preference || 'morning';

  // Updated theme colors to match RebrandMainWebsite
  const themeColors = {
    morning: {
      sidebarBg: 'from-white to-white',
      sidebarBorder: 'border-[#7AD4A0]/30',
      activeItem: 'text-[#00A86B] bg-[#E8FCF0]',
      hoverItem: 'hover:text-[#00A86B] hover:bg-[#E8FCF0]',
      navText: 'text-[#4A6B55]',
      cssVars: {
        '--theme-primary': '0 168 107',
        '--theme-primary-light': '232 252 240',
        '--theme-primary-dark': '13 155 118',
        '--theme-bg-from': '232 252 240',
        '--theme-bg-to': '219 238 227',
        '--theme-card-bg': '255 255 255',
        '--theme-border': '122 212 160 / 0.3'
      }
    },
    afternoon: {
      sidebarBg: 'from-[#00A86B] to-[#0D9B76]',
      sidebarBorder: 'border-[#36CE8E]/40',
      activeItem: 'text-white bg-white/20',
      hoverItem: 'hover:text-white hover:bg-white/10',
      navText: 'text-white/90',
      cssVars: {
        '--theme-primary': '0 168 107',
        '--theme-primary-light': '208 237 111',
        '--theme-primary-dark': '13 155 118',
        '--theme-bg-from': '232 252 240',
        '--theme-bg-to': '219 238 227',
        '--theme-card-bg': '255 255 255',
        '--theme-border': '54 206 142 / 0.3'
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

  return (
      <div className="min-h-screen flex flex-col w-full" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        {/* Top Nav for big screens - only show when logged in */}
        {user && (
          <div className="hidden lg:block sticky top-0 z-50 shadow-lg bg-white/95">
            <TopNav location={location} colors={colors} user={user} isLoading={isLoading} theme={theme} />
          </div>
        )}

        {/* Mobile navigation header - only show when logged in */}
        {user && (
        <nav className={`lg:hidden sticky top-0 z-50 bg-white shadow-sm`}>
          <div className="flex items-center justify-between px-4 py-4 safe-area-inset-top">
            {/* Logo on the left - italic serif style */}
            <Link to={createPageUrl("Home")} className="font-serif italic text-2xl text-[#0A1A10] tracking-wide">
              Vony
            </Link>

            {/* Hamburger menu button on the right */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMobileMenuOpen(prev => !prev);
              }}
              className="p-2 rounded-lg transition-all duration-200 text-[#0A1A10] hover:bg-[#E8FCF0] cursor-pointer"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </nav>
        )}

        {/* Mobile menu dropdown - separate from nav for proper positioning */}
        {user && mobileMenuOpen && (
          <>
            {/* Overlay */}
            <div
              className="lg:hidden fixed inset-0 bg-black/20 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Menu */}
            <div className="lg:hidden fixed top-[72px] left-0 right-0 z-50 bg-white border-b border-[#7AD4A0]/30 shadow-lg">
              <div className="px-4 py-3 space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                      location.pathname === item.url
                        ? "text-[#00A86B] bg-[#E8FCF0]"
                        : "text-[#4A6B55] hover:text-[#00A86B] hover:bg-[#E8FCF0]"
                    }`}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Main content container */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
}

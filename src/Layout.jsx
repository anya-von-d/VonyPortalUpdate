import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import TopNav from "@/components/TopNav";

export default function Layout({ children }) {
  const location = useLocation();
  const { userProfile, isLoadingAuth, refreshProfile } = useAuth();

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

  const user = userProfile;

  // Use user preference or default to morning
  const theme = user?.theme_preference || 'morning';

  // Updated theme colors to match RebrandMainWebsite
  const themeColors = {
    morning: {
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
      {/* TopNav handles its own fixed positioning and mobile menu */}
      {user && <TopNav location={location} />}

      {/* Main content container */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

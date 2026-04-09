import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const topBarItems = [
  { title: "Notifications", url: createPageUrl("Requests") },
  { title: "Friends",       url: createPageUrl("Friends") },
  { title: "My Documents",  url: createPageUrl("LoanAgreements") },
  { title: "Recent Activity", url: createPageUrl("RecentActivity") },
  { title: "Profile",       url: createPageUrl("Profile") },
];

const bottomLeftItems = [
  { title: "Dashboard", url: createPageUrl("Home") },
  { title: "Lending",   url: createPageUrl("Lending") },
];

const bottomRightItems = [
  { title: "Borrowing", url: createPageUrl("Borrowing") },
];

const allNavItems = [...bottomLeftItems, ...bottomRightItems, ...topBarItems];

const GLASS_NAV = {
  backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 7%, rgba(255,255,255,0) 86%)',
  backgroundColor: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(16px) saturate(1.5)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
  boxShadow: 'inset 0 -5px 6px 0 rgba(255,255,255,0.5), inset 0 -8px 24px 0 rgba(255,255,255,0.12), 0 2px 4px -2px rgba(0,0,0,0.08), 0 8px 16px -8px rgba(0,0,0,0.03)',
  border: '1px solid rgba(255,255,255,0.4)',
};

export default function TopNav({ location }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleNavClick = () => {
    setMenuOpen(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 150);
  };

  const isActive = (url) => location.pathname === url;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
    exit:   { opacity: 0, transition: { staggerChildren: 0.03, staggerDirection: -1 } },
  };
  const itemVariants = {
    hidden:   { opacity: 0, y: 30 },
    visible:  { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit:     { opacity: 0, y: -20, transition: { duration: 0.2 } },
  };

  return (
    <>
      {/* Fixed nav bar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '12px 40px 0', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 50, borderRadius: 16, padding: '0 20px', ...GLASS_NAV }}>

            {/* Logo */}
            <Link to={createPageUrl("Home")} onClick={handleNavClick} style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 400, fontStyle: 'italic', fontSize: '1.3rem',
              letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none',
              flexShrink: 0, marginRight: 14,
            }}>Vony</Link>

            {/* Desktop nav links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'center' }}>
              {[...bottomLeftItems, ...bottomRightItems].map(item => (
                <Link key={item.title} to={item.url} onClick={handleNavClick} style={{
                  display: 'inline-flex', alignItems: 'center', padding: '6px 16px',
                  borderRadius: 10, textDecoration: 'none', fontSize: 14,
                  fontWeight: isActive(item.url) ? 600 : 500,
                  color: '#1A1918',
                  background: isActive(item.url) ? 'rgba(0,0,0,0.06)' : 'transparent',
                  transition: 'background 0.2s', whiteSpace: 'nowrap',
                }}>
                  {item.title}
                </Link>
              ))}
            </div>

            {/* Right side: secondary links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {topBarItems.map(item => (
                <Link key={item.title} to={item.url} onClick={handleNavClick} style={{
                  fontSize: 12, fontWeight: 500, color: isActive(item.url) ? '#1A1918' : '#787776',
                  textDecoration: 'none', whiteSpace: 'nowrap', padding: '4px 8px',
                  borderRadius: 8, transition: 'color 0.15s',
                }}>
                  {item.title}
                </Link>
              ))}
            </div>

            {/* Mobile: hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display: 'none', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: menuOpen ? '#ECEAE6' : 'rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}
              className="mobile-hamburger"
              aria-label="Menu"
            >
              {menuOpen ? <X size={18} stroke="#1f1f1f" /> : <Menu size={18} stroke="#1f1f1f" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              backgroundColor: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(18px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(18px) saturate(1.5)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <motion.nav
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px 32px' }}
              variants={containerVariants} initial="hidden" animate="visible" exit="exit"
            >
              {allNavItems.map(item => (
                <motion.div key={item.title} variants={itemVariants} style={{ borderBottom: '0.5px solid rgba(31,31,31,0.06)', width: '100%', textAlign: 'center' }}>
                  <Link to={item.url} onClick={handleNavClick} style={{
                    display: 'block', padding: '18px 0',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    color: '#1f1f1f', textDecoration: 'none',
                    opacity: isActive(item.url) ? 1 : 0.6,
                  }}>
                    {item.title}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
            <div style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(31,31,31,0.4)', margin: 0 }}>
                Vony · Lending Made Simple
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div style={{ height: 88 }} />
    </>
  );
}

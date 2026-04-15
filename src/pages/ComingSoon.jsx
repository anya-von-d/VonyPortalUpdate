import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import SidebarBottomSection from '../components/SidebarBottomSection';
import MeshMobileNav from "@/components/MeshMobileNav";

const LEARN_CATEGORIES = [
  { id: 'lending', label: 'Lending with Friends' },
  { id: 'basics', label: 'The Basics' },
  { id: 'saving', label: 'Saving & Budgeting' },
  { id: 'traditional', label: 'Traditional Loans' },
  { id: 'debt', label: 'Managing Debt' },
];

const CAT_COLORS = {
  lending:     { bg: '#FBFDFF', badge: 'rgba(37,99,235,0.06)',   badgeText: '#1D4ED8', title: '#1E3A8A', border: 'rgba(30,58,138,0.28)' },
  basics:      { bg: '#FAFEF9', badge: 'rgba(5,150,105,0.06)',   badgeText: '#065F46', title: '#064E3B', border: 'rgba(6,78,59,0.28)' },
  saving:      { bg: '#FDFAFF', badge: 'rgba(124,58,237,0.06)',  badgeText: '#6D28D9', title: '#4C1D95', border: 'rgba(76,29,149,0.28)' },
  traditional: { bg: '#FFFEFC', badge: 'rgba(217,119,6,0.06)',   badgeText: '#92400E', title: '#78350F', border: 'rgba(120,53,15,0.28)' },
  debt:        { bg: '#FFFCFD', badge: 'rgba(225,29,72,0.06)',   badgeText: '#9F1239', title: '#881337', border: 'rgba(136,19,55,0.28)' },
};

const LEARN_ARTICLES = {
  lending: [
    { title: 'How to Lend Money Without Damaging a Relationship', body: 'Setting expectations, using agreements, and protecting the friendship above all else.' },
    { title: 'Tax implications of peer lending', body: 'What the IRS expects when you lend or borrow over $10k, how gift rules apply, and when interest income matters.' },
    { title: 'Setting Fair Loan Terms Between Friends', body: 'How to agree on interest, timelines, and what happens if things go sideways.' },
    { title: "What to Do When a Friend Can't Pay You Back", body: 'Practical steps for having the conversation without burning the bridge.' },
    { title: 'The Case for a Written Agreement', body: 'Why putting it in writing protects both sides, and what to include.' },
    { title: 'How to Ask to Borrow Money Gracefully', body: 'Framing the ask, being specific, and making it easy for the other person to say yes or no.' },
  ],
  basics: [
    { title: 'What Is Interest, and How Does It Work?', body: 'A plain-language breakdown of how lenders make money and what it means for you.' },
    { title: "Gross vs. Net Income: What's the Difference?", body: 'Understanding what you actually take home, and why it matters for budgeting.' },
    { title: 'How to Read a Bank Statement', body: 'Demystifying the numbers, codes, and fees hiding in your monthly statement.' },
    { title: 'What Is a Credit Score?', body: 'How your score is calculated, what affects it, and why it matters.' },
    { title: 'APR vs. Interest Rate: Which One Should You Care About?', body: 'The often-confused pair that determines how much a loan truly costs.' },
    { title: 'How Compound Interest Can Work For (or Against) You', body: 'The eighth wonder of the world, and how to make it your ally.' },
  ],
  saving: [
    { title: 'The 50/30/20 Rule, Explained', body: 'A simple framework for splitting your income into needs, wants, and savings.' },
    { title: 'Building an Emergency Fund from Scratch', body: 'How to start saving when money is tight, and why 3-6 months of expenses is the target.' },
    { title: 'The Psychology of Saving', body: 'Why saving feels hard even when we know we should, and how to rewire that instinct.' },
    { title: 'High-Yield Savings Accounts, Explained', body: 'What they are, how they work, and whether you should move your money there.' },
    { title: 'Setting Financial Goals That Actually Stick', body: 'How to make goals specific, time-bound, and woven into your everyday habits.' },
    { title: 'Zero-Based Budgeting: Give Every Dollar a Job', body: 'A method that assigns a purpose to every dollar before the month begins.' },
  ],
  traditional: [
    { title: 'How Personal Loans Work', body: 'What banks look for, how repayment schedules are structured, and what to watch out for.' },
    { title: 'What Happens When You Miss a Loan Payment?', body: 'Late fees, credit impact, and how to communicate with your lender before things escalate.' },
    { title: "Secured vs. Unsecured Loans: What's the Risk?", body: 'Why collateral changes everything, and when each type makes sense.' },
    { title: 'How Banks Calculate Loan Eligibility', body: 'The debt-to-income ratios, credit checks, and underwriting criteria that determine your approval.' },
    { title: 'The True Cost of a Payday Loan', body: 'Short-term convenience, long-term trap. The math behind one of the most expensive products in finance.' },
    { title: 'Understanding Your Credit Report', body: 'How to read it, dispute errors, and use it to your advantage.' },
  ],
  debt: [
    { title: 'Debt Snowball vs. Debt Avalanche: Which Is Right for You?', body: 'Two proven strategies for paying off debt, and how to pick the one that fits your mindset.' },
    { title: 'How to Prioritise Which Debt to Pay First', body: 'Interest rates, balances, and psychological factors: how to rank what you owe.' },
    { title: "When Does Debt Consolidation Make Sense?", body: "Combining multiple debts into one. The benefits, the risks, and who it's right for." },
    { title: 'Understanding Your Debt-to-Income Ratio', body: 'The metric lenders use to size you up, and how to improve it over time.' },
    { title: 'Negotiating with Creditors: What You Can Actually Do', body: 'Settlement offers, hardship plans, and scripts for having uncomfortable conversations.' },
    { title: 'How Debt Affects Your Credit Score Over Time', body: 'The relationship between what you owe and how lenders perceive your risk.' },
  ],
};

/* ── Star button ─────────────────────────────────────────── */
function StarButton({ saved, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {saved && (
        <span style={{
          background: '#FEF9C3', border: '1px solid #FDE68A',
          borderRadius: 6, padding: '2px 8px',
          fontSize: 11, fontWeight: 600, color: '#92400E',
          whiteSpace: 'nowrap', lineHeight: 1.4,
        }}>Saved</span>
      )}
      <button
        onClick={onToggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        aria-label={saved ? 'Unsave' : 'Save'}
      >
        {saved ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        )}
      </button>
    </div>
  );
}

/* ── Your Picks list ─────────────────────────────────────── */
function YourPicksList({ savedSet, onRemove }) {
  const picks = [];
  LEARN_CATEGORIES.forEach(cat => {
    (LEARN_ARTICLES[cat.id] || []).forEach(article => {
      const key = article.title;
      if (savedSet.has(key)) picks.push({ ...article, catLabel: cat.label });
    });
  });
  if (picks.length === 0) return (
    <p style={{ fontSize: 12, color: '#C5C3C0', margin: 0, paddingLeft: 4 }}>Nothing saved yet.</p>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {picks.map(p => (
        <div key={p.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <button onClick={() => onRemove(p.title)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', lineHeight: 1.3, marginBottom: 1 }}>{p.title}</div>
            <div style={{ fontSize: 10, color: '#9B9A98' }}>{p.catLabel}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ComingSoon() {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const [learnCategory, setLearnCategory] = useState('lending');
  const [saved, setSaved] = useState(new Set());

  const toggleSave = (title) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  };

  return (
    <div className="mesh-layout" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
      <MeshMobileNav user={user} activePage="Learn" />

      {/* ── LEFT: Sidebar nav ── */}
      <div className="mesh-left" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ position: 'sticky', top: 0, padding: '24px 8px 0', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
          <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.3rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 16, paddingLeft: 6 }}>Vony</Link>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { label: 'Home', to: '/' },
              { label: 'Upcoming', to: createPageUrl("Upcoming") },
              { label: 'Create Loan', to: createPageUrl("CreateOffer") },
              { label: 'Record Payment', to: createPageUrl("RecordPayment") },
              { label: 'My Loans', to: createPageUrl("YourLoans") },
              { label: 'Friends', to: createPageUrl("Friends") },
              { label: 'Recent Activity', to: createPageUrl("RecentActivity") },
              { label: 'Documents', to: createPageUrl("LoanAgreements") },
            ].map(({ label, to }) => {
              const currentPath = window.location.pathname;
              const isActive = to === '/' ? currentPath === '/' : currentPath.includes(to.split('?')[0].replace('/app/', ''));
              const navIcons = {
                'Home': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                'Upcoming': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                'Create Loan': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
                'Record Payment': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
                'My Loans': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
                'Friends': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                'Recent Activity': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                'Documents': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
              };
              return (
                <Link key={label} to={to} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1A1918' : '#787776',
                  background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                  fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
                }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, background: isActive ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{navIcons[label]}</span>
                  {label}
                </Link>
              );
            })}

            {/* Coming Soon section */}
            <div style={{ marginTop: 16, marginBottom: 4, paddingLeft: 12 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Coming Soon</span>
            </div>
            {[
              { label: 'Learn', to: createPageUrl("ComingSoon") },
              { label: 'Loan Help', to: createPageUrl("LoanHelp") },
            ].map(({ label, to }) => {
              const currentPath = window.location.pathname;
              const isActive = currentPath.includes(to.split('?')[0].replace('/app/', ''));
              const soonIcons = {
                'Learn': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
                'Loan Help': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
              };
              return (
                <Link key={label} to={to} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1A1918' : '#787776',
                  background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                  fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
                }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, background: isActive ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{soonIcons[label]}</span>
                  <span style={{ flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'transparent', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2, flexShrink: 0 }}>SOON</span>
                </Link>
              );
            })}

            {/* Your Picks */}
            {saved.size > 0 && (
              <>
                <div style={{ marginTop: 20, marginBottom: 6, paddingLeft: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your Picks</span>
                </div>
                <div style={{ paddingLeft: 4, paddingRight: 4 }}>
                  <YourPicksList savedSet={saved} onRemove={title => toggleSave(title)} />
                </div>
              </>
            )}
          </nav>
          <SidebarBottomSection />
        </div>
      </div>

      {/* ── CENTER: articles ── */}
      <div className="mesh-center" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '24px 32px 80px' }}>

        {/* Desktop view */}
        <div className="learn-desktop-view">
          {/* Page title */}
          <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Learn</div>
          <div style={{ height: 1, background: '#03ACEA', marginLeft: -32, marginRight: -32, marginBottom: 20 }} />

          {/* VonyHomePage-style glassmorphic nav — centered */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              borderRadius: 16, padding: '5px 8px',
              backdropFilter: 'blur(16px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
              background: 'rgba(255,255,255,0.75)',
              boxShadow: '0px 2px 4px -2px rgba(0,0,0,0.08), 0px 8px 16px -8px rgba(0,0,0,0.03), inset 0px -5px 6px rgba(255,255,255,0.5), inset 0px -8px 24px rgba(255,255,255,0.12)',
            }}>
              {LEARN_CATEGORIES.map(cat => {
                const active = learnCategory === cat.id;
                return (
                  <button key={cat.id} onClick={() => setLearnCategory(cat.id)} style={{
                    padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: active ? 'rgba(0,0,0,0.06)' : 'transparent',
                    fontSize: 13, fontWeight: active ? 600 : 500, fontFamily: "'DM Sans', system-ui, sans-serif",
                    letterSpacing: '-0.01em', whiteSpace: 'nowrap',
                    color: active ? '#1A1918' : '#787776', transition: 'all 0.2s',
                  }}>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Articles grid */}
          <div className="page-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {(LEARN_ARTICLES[learnCategory] || []).map((article, index) => {
              const clr = CAT_COLORS[learnCategory];
              return (
                <motion.div key={article.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} style={{ background: clr.bg, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', cursor: 'default', border: `1px solid ${clr.border}`, position: 'relative' }}>
                  {/* Star */}
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <StarButton saved={saved.has(article.title)} onToggle={() => toggleSave(article.title)} />
                  </div>
                  <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, color: clr.badgeText, textTransform: 'uppercase', letterSpacing: '0.08em', background: clr.badge, borderRadius: 5, padding: '2px 7px', marginBottom: 8 }}>Coming Soon</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: clr.title, lineHeight: 1.35, marginBottom: 6, paddingRight: 22 }}>{article.title}</div>
                  <div style={{ fontSize: 12, color: '#787776', lineHeight: 1.5 }}>{article.body}</div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: all categories as titled sections with horizontal scroll */}
        <div className="learn-mobile-sections">
          <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Learn</div>
          <div style={{ height: 1, background: '#03ACEA', marginLeft: -32, marginRight: -32, marginBottom: 20 }} />

          {LEARN_CATEGORIES.map(cat => (
            <section key={cat.id} style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', margin: '0 0 12px 0' }}>
                {cat.label}
              </h3>
              <div className="h-scroll-cards">
                {(LEARN_ARTICLES[cat.id] || []).map((article) => {
                  const clr = CAT_COLORS[cat.id];
                  return (
                    <div key={article.title} className="h-scroll-card" style={{ background: clr.bg, borderRadius: 14, padding: '14px 15px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: `1px solid ${clr.border}`, position: 'relative' }}>
                      {/* Star */}
                      <div style={{ position: 'absolute', top: 10, right: 10 }}>
                        <StarButton saved={saved.has(article.title)} onToggle={() => toggleSave(article.title)} />
                      </div>
                      <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, color: clr.badgeText, textTransform: 'uppercase', letterSpacing: '0.08em', background: clr.badge, borderRadius: 5, padding: '2px 7px', marginBottom: 8 }}>Coming Soon</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: clr.title, lineHeight: 1.35, marginBottom: 6, paddingRight: 22 }}>{article.title}</div>
                      <div style={{ fontSize: 12, color: '#787776', lineHeight: 1.5 }}>{article.body}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Mobile Your Picks */}
          {saved.size > 0 && (
            <section style={{ marginTop: 8, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 14px 0' }}>
                Your Picks
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(() => {
                  const picks = [];
                  LEARN_CATEGORIES.forEach(cat => {
                    (LEARN_ARTICLES[cat.id] || []).forEach(article => {
                      if (saved.has(article.title)) picks.push({ ...article, catLabel: cat.label });
                    });
                  });
                  return picks.map(p => (
                    <div key={p.title} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <button onClick={() => toggleSave(p.title)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      </button>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', lineHeight: 1.3, marginBottom: 2 }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: '#92400E' }}>{p.catLabel}</div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </section>
          )}
        </div>

      </div>
    </div>
  );
}

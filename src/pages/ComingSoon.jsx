import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from '../components/DesktopSidebar';

const LEARN_CATEGORIES = [
  { id: 'using', label: 'Using Vony' },
  { id: 'lending', label: 'Lending with Friends' },
  { id: 'basics', label: 'The Basics' },
  { id: 'saving', label: 'Saving & Budgeting' },
  { id: 'traditional', label: 'Traditional Loans' },
  { id: 'debt', label: 'Managing Debt' },
];

// Pastel backgrounds with matching mid-tone text — all complementary to the
// Using Vony accent (#EBF4FA bg / #03ACEA text).
const CAT_COLORS = {
  using:       { pill: '#EBF4FA', text: '#03ACEA' }, // sky
  lending:     { pill: '#EAF0FB', text: '#5B8BD6' }, // soft periwinkle blue
  basics:      { pill: '#E8F5EE', text: '#4FAE87' }, // mint green
  saving:      { pill: '#F0ECFB', text: '#8B7ED1' }, // lavender
  traditional: { pill: '#FBF0E8', text: '#D39266' }, // peach
  debt:        { pill: '#FBEAEE', text: '#D47A8E' }, // rose
};

const LEARN_ARTICLES = {
  using: [
    { title: 'Promissory Notes Explained', body: 'What a promissory note actually is, what it should contain, and why every loan on Vony comes with one.' },
    { title: 'How to Use an Amortization Table', body: 'Reading your payment schedule: principal vs. interest, remaining balance, and why each line matters.' },
    { title: "What to do if you don't get paid back on vony", body: 'Your options when a loan goes sideways, from gentle reminders to formal steps, all built into the platform.' },
  ],
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
  );
}

/* ── Multi-select dropdown ─────────────────────────────────── */
function MultiSelectDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id));
    else onChange([...selected, id]);
  };

  const displayLabel = selected.length === 0
    ? label
    : selected.length === 1
      ? options.find(o => o.id === selected[0])?.label || label
      : `${selected.length} selected`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.06)', background: selected.length > 0 ? 'rgba(3,172,234,0.08)' : 'white',
          fontSize: 13, fontWeight: 500, color: '#1A1918', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s',
        }}
      >
        {displayLabel}
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 220,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 6, maxHeight: 280, overflowY: 'auto',
        }}>
          {options.map(opt => (
            <label
              key={opt.id}
              onClick={() => toggle(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                cursor: 'pointer', fontSize: 13, color: '#1A1918', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 5, border: selected.includes(opt.id) ? 'none' : '1.5px solid rgba(0,0,0,0.2)',
                background: selected.includes(opt.id) ? '#03ACEA' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}>
                {selected.includes(opt.id) && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </div>
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Shuffle helper ───────────────────────────────────────── */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Article card ─────────────────────────────────────────── */
function ArticleCard({ article, catId, catLabel, saved, onToggle, index }) {
  const clr = CAT_COLORS[catId];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      style={{
        background: '#ffffff', borderRadius: 10, padding: '14px 16px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)', cursor: 'default',
        border: 'none', position: 'relative', minHeight: 140,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Star */}
      <div style={{ position: 'absolute', top: 10, right: 10 }}>
        <StarButton saved={saved} onToggle={onToggle} />
      </div>
      {/* Category pill */}
      <div style={{
        display: 'inline-block', alignSelf: 'flex-start',
        fontSize: 10, fontWeight: 700, color: clr.text,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        background: clr.pill, borderRadius: 4, padding: '2px 6px',
        marginBottom: 10, marginRight: 30, lineHeight: 1.2,
      }}>{catLabel}</div>
      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', lineHeight: 1.35, marginBottom: 6, paddingRight: 22 }}>
        {article.title}
      </div>
      {/* Body */}
      <div style={{ fontSize: 12, color: '#787776', lineHeight: 1.5, marginBottom: 22 }}>
        {article.body}
      </div>
      {/* Coming Soon footer */}
      <span style={{
        position: 'absolute', bottom: 12, right: 14,
        fontSize: 9, fontWeight: 700, color: '#787776',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
      }}>Coming Soon</span>
    </motion.div>
  );
}

export default function ComingSoon() {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const [categoryFilter, setCategoryFilter] = useState([]); // array of ids; 'saved' is a pseudo-id
  const [saved, setSaved] = useState(new Set());

  const toggleSave = (title) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  };

  // Build flat list of all articles with metadata
  const allArticles = useMemo(() => {
    const list = [];
    LEARN_CATEGORIES.forEach(cat => {
      (LEARN_ARTICLES[cat.id] || []).forEach(article => {
        list.push({ ...article, catId: cat.id, catLabel: cat.label });
      });
    });
    return list;
  }, []);

  // Shuffled order (stable per mount) for when no filter is applied
  const shuffledNonUsing = useMemo(() => {
    const nonUsing = allArticles.filter(a => a.catId !== 'using');
    return shuffleArray(nonUsing);
  }, [allArticles]);

  const hasAnyFilter = categoryFilter.length > 0;
  const savedSelected = categoryFilter.includes('saved');
  const selectedCats = categoryFilter.filter(id => id !== 'saved');

  const displayedArticles = useMemo(() => {
    if (!hasAnyFilter) {
      // Using Vony pinned to top, rest shuffled
      const using = allArticles.filter(a => a.catId === 'using');
      return [...using, ...shuffledNonUsing];
    }
    let list = allArticles;
    if (savedSelected && selectedCats.length === 0) {
      list = list.filter(a => saved.has(a.title));
    } else if (savedSelected && selectedCats.length > 0) {
      list = list.filter(a => selectedCats.includes(a.catId) && saved.has(a.title));
    } else {
      list = list.filter(a => selectedCats.includes(a.catId));
    }
    return list;
  }, [hasAnyFilter, savedSelected, selectedCats, allArticles, shuffledNonUsing, saved]);

  const clearFilters = () => setCategoryFilter([]);

  const CATEGORY_FILTER_OPTIONS = [
    ...LEARN_CATEGORIES.map(c => ({ id: c.id, label: c.label })),
    { id: 'saved', label: 'Saved' },
  ];

  return (
    <div className="mesh-layout" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
      <MeshMobileNav user={user} activePage="Learn" />

      {/* ── LEFT: Sidebar nav ── */}
      <DesktopSidebar />

      {/* ── CENTER: articles ── */}
      <div className="mesh-center" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '24px 32px 80px' }}>

          {/* Mobile-only page title (desktop shows it in top bar) */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 17, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Learn</div>
          </div>

          {/* Filter bar */}
          <div className="filter-row-scroll" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, position: 'relative', zIndex: 20, marginBottom: 20 }}>
            <MultiSelectDropdown label="All Categories" options={CATEGORY_FILTER_OPTIONS} selected={categoryFilter} onChange={setCategoryFilter} />
            <button onClick={clearFilters} style={{ padding: '6px 10px', borderRadius: 8, border: hasAnyFilter ? '1px solid rgba(232,114,110,0.3)' : '1px solid rgba(0,0,0,0.08)', background: hasAnyFilter ? 'rgba(232,114,110,0.06)' : 'transparent', fontSize: 12, fontWeight: 500, color: hasAnyFilter ? '#E8726E' : '#787776', cursor: hasAnyFilter ? 'pointer' : 'default', opacity: hasAnyFilter ? 1 : 0.5, fontFamily: "'DM Sans', sans-serif" }}>Clear Filters</button>
          </div>

          {/* Articles grid */}
          {displayedArticles.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: '#9B9A98' }}>
              No articles match your filters.
            </div>
          ) : (
            <div className="learn-articles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {displayedArticles.map((article, index) => (
                <ArticleCard
                  key={article.title}
                  article={article}
                  catId={article.catId}
                  catLabel={article.catLabel}
                  saved={saved.has(article.title)}
                  onToggle={() => toggleSave(article.title)}
                  index={index}
                />
              ))}
            </div>
          )}

      </div>
    </div>
  );
}

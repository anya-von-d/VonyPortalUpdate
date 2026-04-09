import React, { useState } from "react";
import { motion } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuth } from "@/lib/AuthContext";

const LEARN_CATEGORIES = [
  { id: 'lending', label: 'Lending with Friends' },
  { id: 'basics', label: 'The Basics' },
  { id: 'saving', label: 'Saving & Budgeting' },
  { id: 'traditional', label: 'Traditional Loans' },
  { id: 'debt', label: 'Managing Debt' },
];

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
    { title: 'Building an Emergency Fund from Scratch', body: 'How to start saving when money is tight, and why 3–6 months of expenses is the target.' },
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

export default function ComingSoon() {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const [learnCategory, setLearnCategory] = useState('lending');

  return (
    <div className="home-with-sidebar" style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingTop: 88, background: 'transparent' }}>
      <DashboardSidebar activePage="ComingSoon" user={user} />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 40px', background: 'transparent', position: 'relative', zIndex: 2 }}>

        {/* Hero title */}
        <div style={{ margin: '8px 10px 0', height: 168, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24, position: 'relative' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 1200 168" preserveAspectRatio="xMidYMid slice">
            {[{cx:80,cy:40},{cx:200,cy:110},{cx:320,cy:25},{cx:430,cy:160},{cx:540,cy:70},{cx:660,cy:130},{cx:770,cy:35},{cx:890,cy:175},{cx:1000,cy:80},{cx:1100,cy:140},{cx:150,cy:185},{cx:480,cy:100},{cx:720,cy:180},{cx:950,cy:55},{cx:280,cy:195},{cx:620,cy:48},{cx:1050,cy:195}].map((s, i) => (
              <circle key={i} cx={s.cx} cy={s.cy} r={i % 3 === 0 ? 2.5 : 1.5} fill="white" />
            ))}
          </svg>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 40, fontWeight: 600, color: '#1A1918', margin: 0, letterSpacing: '-0.01em', lineHeight: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <span style={{ fontStyle: 'normal' }}>Learn</span>
          </h1>
        </div>

        {/* Page content */}
        <div className="dashboard-content-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 0 64px', position: 'relative', zIndex: 1 }}>

          {/* Category bar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 14, padding: 4, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {LEARN_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setLearnCategory(cat.id)}
                  style={{
                    padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    fontWeight: learnCategory === cat.id ? 700 : 400,
                    color: learnCategory === cat.id ? '#1A1918' : '#5C5B5A',
                    background: learnCategory === cat.id ? 'white' : 'transparent',
                    boxShadow: learnCategory === cat.id ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Articles grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {(LEARN_ARTICLES[learnCategory] || []).map((article, index) => (
              <motion.div
                key={article.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  background: 'white', borderRadius: 18, padding: '24px 22px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'default',
                  border: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <div style={{
                  display: 'inline-block', fontSize: 10, fontWeight: 600, color: '#9B9A98',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '3px 8px', marginBottom: 14,
                }}>
                  Coming Soon
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', lineHeight: 1.35, marginBottom: 12 }}>
                  {article.title}
                </div>
                <div style={{ fontSize: 13, color: '#787776', lineHeight: 1.6 }}>
                  {article.body}
                </div>
              </motion.div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '12px 28px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="https://www.vony-lending.com/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Terms of Service</a>
            <a href="https://www.vony-lending.com/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Privacy Center</a>
            <a href="https://www.vony-lending.com/do-not-sell" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Do not sell or share my personal information</a>
          </div>
        </div>

      </div>
    </div>
  );
}

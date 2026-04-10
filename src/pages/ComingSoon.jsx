import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { format } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import MeshMobileNav from "@/components/MeshMobileNav";

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
  const { user: authUser, userProfile, logout } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const [learnCategory, setLearnCategory] = useState('lending');

  const [allLoans, setAllLoans] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      Loan.list('-created_at').catch(() => []),
      Payment.list('-created_at').catch(() => []),
      PublicProfile.list().catch(() => []),
    ]).then(([loans, payments, profiles]) => {
      setAllLoans((loans || []).filter(l => l.lender_id === user.id || l.borrower_id === user.id));
      setAllPayments(payments || []);
      setPublicProfiles(profiles || []);
    });
  }, [user?.id]);

  const pendingToConfirm = allPayments.filter(p => {
    const loan = allLoans.find(l => l.id === p.loan_id);
    return loan && loan.lender_id === user?.id && p.status === 'pending_confirmation';
  });

  const recentActivity = allPayments
    .filter(p => p.status === 'confirmed' || p.status === 'completed')
    .slice(0, 5)
    .map(p => {
      const loan = allLoans.find(l => l.id === p.loan_id);
      if (!loan) return null;
      const isLender = loan.lender_id === user?.id;
      const otherId = isLender ? loan.borrower_id : loan.lender_id;
      const otherProfile = publicProfiles.find(pr => pr.user_id === otherId);
      const name = otherProfile?.full_name?.split(' ')[0] || 'User';
      return { id: p.id, isLender, name, amount: p.amount || 0, date: p.payment_date || p.created_at };
    })
    .filter(Boolean);

  const RightSection = ({ title, children }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 9 }}>{title}</div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 14 }} />
      {children}
    </div>
  );

  return (
    <div className="mesh-layout" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '180px 1fr 300px', gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
      <MeshMobileNav user={user} activePage="Learn" />

      {/* ── LEFT: Sidebar nav ── */}
      <div className="mesh-left" style={{ background: '#fafafa', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ position: 'sticky', top: 0, padding: '24px 8px 0' }}>
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
                'Recent Activity': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
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
                  <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}>{navIcons[label]}</span>
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
              const soonIcons = {
                'Learn': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
                'Loan Help': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
              };
              return (
                <Link key={label} to={to} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                  fontSize: 13, fontWeight: 500, color: '#787776',
                  background: 'transparent', fontFamily: "'DM Sans', sans-serif",
                  width: '100%', boxSizing: 'border-box',
                }}>
                  <span style={{ flexShrink: 0, opacity: 0.5 }}>{soonIcons[label]}</span>
                  <span style={{ flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2, flexShrink: 0 }}>SOON</span>
                </Link>
              );
            })}
          </nav>
          {/* Help & Support + Log Out at bottom */}
          <div style={{ marginTop: 24 }}>
            <a href="https://www.vony-lending.com/help" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#9B9A98' }}>Help & Support</span>
            </a>
            <button onClick={() => logout?.()} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9,
              border: 'none', cursor: 'pointer', background: 'transparent',
              fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,114,110,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: '#E8726E' }}>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── CENTER: Category selector + articles ── */}
      <div className="mesh-center" style={{ background: 'white', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '28px 48px 80px' }}>

        {/* Tab header */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', marginLeft: -48, marginRight: -48, paddingLeft: 48, paddingRight: 48 }}>
          {LEARN_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setLearnCategory(cat.id)} style={{
              position: 'relative', paddingBottom: 12,
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 17, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
              letterSpacing: '-0.02em',
              color: learnCategory === cat.id ? '#1A1918' : 'rgba(0,0,0,0.30)',
              transition: 'color 0.2s', whiteSpace: 'nowrap',
            }}>
              {cat.label}
              {learnCategory === cat.id && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(to bottom, transparent 0%, #03ACEA 66.67%, #03ACEA 100%)', pointerEvents: 'none' }} />
              )}
            </button>
          ))}
        </div>
        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginLeft: -48, marginRight: -48, marginBottom: 20 }} />

        {/* Articles grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {(LEARN_ARTICLES[learnCategory] || []).map((article, index) => (
            <motion.div key={article.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} style={{ background: 'white', borderRadius: 18, padding: '24px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'default', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, color: '#9B9A98', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '3px 8px', marginBottom: 14 }}>Coming Soon</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', lineHeight: 1.35, marginBottom: 12 }}>{article.title}</div>
              <div style={{ fontSize: 13, color: '#787776', lineHeight: 1.6 }}>{article.body}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Notifications + Recent Activity ── */}
      <div className="mesh-right" style={{ background: '#fafafa' }}>
        <div style={{ position: 'sticky', top: 0, padding: '28px 28px 0' }}>
          {/* Bell + Profile icons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 24 }}>
            <Link to={createPageUrl("Requests")} style={{ position: 'relative', textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
            </Link>
            <Link to={createPageUrl("Profile")} style={{ textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(3,172,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </div>
            </Link>
          </div>

          {pendingToConfirm.length > 0 && (
            <RightSection title="Notifications">
              {pendingToConfirm.slice(0, 5).map((p) => {
                const loan = allLoans.find(l => l.id === p.loan_id);
                const borrowerProfile = loan ? publicProfiles.find(pr => pr.user_id === loan.borrower_id) : null;
                const name = borrowerProfile?.full_name?.split(' ')[0] || 'User';
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name} paid {formatMoney(p.amount || 0)}</div>
                      <div style={{ fontSize: 11, color: '#9B9A98' }}>Awaiting confirmation</div>
                    </div>
                  </div>
                );
              })}
            </RightSection>
          )}

          {pendingToConfirm.length === 0 && (
            <RightSection title="Notifications">
              <div style={{ fontSize: 12, color: '#9B9A98' }}>All caught up</div>
            </RightSection>
          )}

          <RightSection title="Recent Activity">
            {recentActivity.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9B9A98' }}>No recent activity</div>
            ) : recentActivity.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: item.isLender ? 'rgba(3,172,234,0.12)' : 'rgba(126,192,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={item.isLender ? '#03ACEA' : '#7EC0EA'} strokeWidth="2.5" strokeLinecap="round">
                    {item.isLender ? <polyline points="17 11 12 6 7 11"/> : <polyline points="7 13 12 18 17 13"/>}
                    <line x1="12" y1={item.isLender ? '6' : '18'} x2="12" y2={item.isLender ? '18' : '6'}/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.isLender ? `${item.name} paid you` : `You paid ${item.name}`}</div>
                  <div style={{ fontSize: 11, color: '#9B9A98' }}>{formatMoney(item.amount)}</div>
                </div>
              </div>
            ))}
          </RightSection>
        </div>
      </div>

    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { formatMoney } from "@/components/utils/formatMoney";
import MeshMobileNav from "@/components/MeshMobileNav";

const CATEGORIES = [
  { id: 'student',  label: 'Student Loans' },
  { id: 'credit',   label: 'Credit Cards' },
  { id: 'personal', label: 'Personal Loans' },
  { id: 'auto',     label: 'Auto Loans' },
  { id: 'home',     label: 'Home Loans' },
];

const LOANS = {
  personal: [
    { name: 'LightStream', tagline: 'Best for excellent credit', details: ['Rates from 7.99% APR with autopay discount.', 'No fees of any kind: no origination, no prepayment.', 'Same-day funding available for qualified borrowers.'] },
    { name: 'Marcus by Goldman Sachs', tagline: 'Best for no-fee borrowing', details: ['Fixed rates with zero fees, ever. Borrow $3,500 to $40,000.', 'Choose a repayment term from 36 to 72 months.', 'On-time payment reward: skip a month after 12 consecutive payments.'] },
    { name: 'SoFi Personal', tagline: 'Best for career-focused borrowers', details: ['Unemployment protection if you lose your job mid-loan.', 'Rate discounts for autopay and existing SoFi members.', 'No origination fees, no prepayment penalties.'] },
    { name: 'Upstart', tagline: 'Best for thin credit files', details: ['AI underwriting considers education and career history.', 'Accessible to borrowers with limited credit history.', 'Next-business-day funding for most approved applicants.'] },
    { name: 'Discover Personal', tagline: 'Best for flexible repayment', details: ['30-day money-back guarantee: return funds, pay no interest.', 'No origination fee. Terms from 36 to 84 months.', 'Direct payment to creditors available for debt consolidation.'] },
    { name: 'Avant', tagline: 'Best for fair credit borrowers', details: ['Rates from 9.95% APR, designed for fair to good credit profiles.', 'Loan amounts from $2,000 to $35,000. Terms from 24 to 60 months.', 'Fast decisions: most applicants hear back the same business day.'] },
  ],
  student: [
    { name: 'Earnest', tagline: 'Best for flexible repayment', details: ['Precision pricing: set your exact monthly payment.', 'No late fees, no origination fees, no prepayment penalties.', 'Skip one payment per year if your finances change.'] },
    { name: 'SoFi Student', tagline: 'Best for career perks', details: ['Career coaching and job placement assistance included.', 'Unemployment protection suspends payments if you lose work.', 'Referral bonuses and member rate discounts available.'] },
    { name: 'College Ave', tagline: 'Best for customizable terms', details: ['Choose your repayment period: 5, 8, 10, or 15 years.', 'In-school payment options from full deferral to interest-only.', 'Fast approvals, often within three minutes.'] },
    { name: 'Sallie Mae', tagline: 'Best for undergrad borrowers', details: ['Smart Option Student Loan with multiple repayment tracks.', 'Cosigner release available after 12 consecutive on-time payments.', 'Chegg study tools included for free.'] },
    { name: 'Ascent', tagline: 'Best for borrowers without a cosigner', details: ['Non-cosigned loans available based on GPA and school.', '1% cash back on principal when you graduate.', 'Financial literacy tools built into the platform.'] },
    { name: 'RISLA', tagline: 'Best for low rates', details: ['Income-based repayment available if income drops below threshold.', 'Rates as low as 4.99% fixed for well-qualified borrowers.', 'No origination fees.'] },
  ],
  credit: [
    { name: 'Chase Sapphire Preferred', tagline: 'Best for travel rewards', details: ['60,000 bonus points after spending $4,000 in first 3 months.', '3x points on dining, 2x on travel, 1x on everything else.', '$95 annual fee with $50 hotel credit each year.'] },
    { name: 'Citi Double Cash', tagline: 'Best for flat-rate cashback', details: ['2% cash back on everything: 1% when you buy, 1% when you pay.', 'No annual fee, no rotating categories to track.', 'Flexible redemption: check, statement credit, or gift cards.'] },
    { name: 'Discover it Cash Back', tagline: 'Best for rotating categories', details: ['5% back in rotating quarterly categories (up to $1,500 per quarter).', 'First-year cashback match: Discover doubles everything you earned.', 'No annual fee.'] },
    { name: 'Capital One Venture X', tagline: 'Best for premium travel', details: ['75,000 bonus miles on $4,000 spend in first 3 months.', '$300 annual travel credit + 10,000 anniversary miles each year.', 'Access to Priority Pass and Capital One airport lounges.'] },
    { name: 'American Express Blue Cash Preferred', tagline: 'Best for groceries', details: ['6% cash back at U.S. supermarkets (up to $6,000/year).', '6% on select U.S. streaming subscriptions.', '$95 annual fee (waived first year).'] },
    { name: 'Wells Fargo Active Cash', tagline: 'Best no-annual-fee cashback', details: ['Unlimited 2% cash rewards on all purchases.', '$200 cash rewards bonus after $500 spend in first 3 months.', 'Cell phone protection up to $600 per claim.'] },
  ],
  auto: [
    { name: 'PenFed Credit Union', tagline: 'Best credit union rates', details: ['New car rates as low as 4.74% APR for well-qualified members.', 'No application fee, decisions often same-day.', 'Financing for new, used, and refinanced vehicles.'] },
    { name: 'LightStream Auto', tagline: 'Best for excellent credit', details: ['Rates as low as 6.49% for new vehicles with autopay.', 'No restrictions on make, model, or age of vehicle.', 'Same-day funding for approved borrowers who apply early.'] },
    { name: 'Bank of America Auto', tagline: 'Best for existing customers', details: ['Rate discounts up to 0.5% for Preferred Rewards members.', 'Dealer network of 11,000+ for easy pre-approval.', 'Online pre-qualification with no hard inquiry.'] },
    { name: 'Capital One Auto Finance', tagline: 'Best for online process', details: ['Pre-qualify in minutes with no impact to your credit score.', 'Navigate to participating dealers with financing in place.', 'MyAutoLoan integration for side-by-side rate comparisons.'] },
    { name: 'Consumers Credit Union', tagline: 'Best for membership perks', details: ['New car rates starting at 4.84% APR for top-tier borrowers.', 'Rate discounts for automatic payment enrollment.', 'GAP coverage and extended warranty add-ons available.'] },
    { name: 'Carvana Financing', tagline: 'Best for online car buying', details: ['Shop, finance, and buy entirely online with delivery to your door.', '7-day return policy after purchase.', 'Pre-qualify without affecting your credit score.'] },
  ],
  home: [
    { name: 'Rocket Mortgage', tagline: 'Best for speed and ease', details: ['Full online application with real-time approval decisions.', 'YOURgage option: choose any term from 8 to 29 years.', 'Pre-approval letter in minutes, not days.'] },
    { name: 'Better Mortgage', tagline: 'Best for no-commission lending', details: ['No lender fees: no origination, no underwriting, no application fee.', 'Rates often 0.5–1% lower due to no commission structure.', 'Fully digital application with 24/7 access to a loan team.'] },
    { name: 'Ally Home', tagline: 'Best for home buyer grants', details: ['Up to $5,000 in closing cost grants for eligible borrowers.', 'No application or origination fee.', 'HomeReady and Home Possible low-down-payment options.'] },
    { name: 'Chase Mortgage', tagline: 'Best for big-bank reliability', details: ['DreaMaker loan: 3% down with reduced mortgage insurance.', 'Rate lock for up to 90 days while you shop.', 'Relationship pricing discounts for Chase bank customers.'] },
    { name: 'Veterans United', tagline: 'Best for VA loans', details: ['Specializes exclusively in VA home loans for military borrowers.', 'VA loans require 0% down payment with no PMI.', 'Dedicated loan team with experience in military-specific benefits.'] },
    { name: 'Guild Mortgage', tagline: 'Best for first-time buyers', details: ['Down payment assistance programs in 49 states.', '3-2-1 Home program: 3% down, $2,000 closing credit, 1% lower rate.', 'Dedicated first-time homebuyer specialists in branches nationwide.'] },
  ],
};

export default function LoanHelp() {
  const { user: authUser, userProfile, logout } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const [category, setCategory] = useState('student');
  const [compared, setCompared] = useState({});

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
      return { id: p.id, isLender, name, amount: p.amount || 0 };
    })
    .filter(Boolean);

  const toggleCompare = (key) => setCompared(prev => ({ ...prev, [key]: !prev[key] }));
  const loans = LOANS[category] || [];

  const RightSection = ({ title, children }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 9 }}>{title}</div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 14 }} />
      {children}
    </div>
  );

  return (
    <div className="mesh-layout" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '180px 1fr 300px', gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
      <MeshMobileNav user={user} activePage="Loan Help" />

      {/* ── LEFT: Sidebar nav ── */}
      <div className="mesh-left" style={{ background: '#fafafa', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ position: 'sticky', top: 0, padding: '24px 8px 0' }}>
          <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.3rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 16, paddingLeft: 6 }}>Vony</Link>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'Home', to: '/', active: false },
              { label: 'Upcoming', to: createPageUrl("Upcoming"), active: false },
              { label: 'Create Loan', to: createPageUrl("CreateOffer"), active: false },
              { label: 'Record Payment', to: createPageUrl("RecordPayment"), active: false },
              { label: 'My Loans', to: createPageUrl("YourLoans"), active: false },
              { label: 'Friends', to: createPageUrl("Friends"), active: false },
              { label: 'Recent Activity', to: createPageUrl("RecentActivity"), active: false },
              { label: 'Documents', to: createPageUrl("LoanAgreements"), active: false },
            ].map(({ label, to, active: isActive }) => (
              <Link key={label} to={to} style={{ display: 'block', padding: '6px 12px', borderRadius: 9, textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? '#1A1918' : '#787776', background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent', fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box' }}>{label}</Link>
            ))}
            {/* Coming Soon section */}
            <div style={{ marginTop: 16, marginBottom: 4, paddingLeft: 12 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Coming Soon</span>
            </div>
            {[
              { label: 'Learn', to: createPageUrl("ComingSoon") },
              { label: 'Loan Help', to: createPageUrl("LoanHelp") },
            ].map(({ label, to }) => (
              <Link key={label} to={to} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', borderRadius: 9, textDecoration: 'none',
                fontSize: 13, fontWeight: 500, color: '#787776',
                background: 'transparent', fontFamily: "'DM Sans', sans-serif",
                width: '100%', boxSizing: 'border-box',
              }}>
                {label}
                <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2 }}>SOON</span>
              </Link>
            ))}
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

      {/* ── CENTER: Category selector + loan cards ── */}
      <div className="mesh-center" style={{ background: 'white', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '28px 48px 80px' }}>

        {/* Page title */}
        <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: '#1A1918', marginBottom: 12 }}>Loan Help</div>
        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 20 }} />

        {/* Category selector bar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 14, padding: 4, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: category === cat.id ? 700 : 400, color: category === cat.id ? '#1A1918' : '#5C5B5A', background: category === cat.id ? 'white' : 'transparent', boxShadow: category === cat.id ? '0 1px 6px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loan cards grid — 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {loans.map((loan, index) => {
            const isRecommended = index === 0;
            const compareKey = `${category}-${loan.name}`;
            const isCompared = compared[compareKey] || false;
            return (
              <motion.div key={loan.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} style={{ background: 'white', borderRadius: 14, border: isRecommended ? '1.5px solid rgba(3,172,234,0.3)' : '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 16px 7px', display: 'flex', alignItems: 'center', gap: 5, background: isRecommended ? 'rgba(3,172,234,0.06)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  {isRecommended ? (
                    <>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="#03ACEA" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#03ACEA', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Recommended</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>{CATEGORIES.find(c => c.id === category)?.label}</span>
                  )}
                </div>
                <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', marginBottom: 2 }}>{loan.name}</div>
                    <div style={{ fontSize: 12, color: isRecommended ? '#03ACEA' : '#787776', fontWeight: 500 }}>{loan.tagline}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, marginBottom: 16 }}>
                    {loan.details.map((line, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', flexShrink: 0, background: isRecommended ? '#03ACEA' : '#C4C3C1', marginTop: 6 }} />
                        <span style={{ fontSize: 13, color: '#5C5B5A', lineHeight: 1.5 }}>{line}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <button style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: isRecommended ? 'rgba(3,172,234,0.1)' : 'rgba(0,0,0,0.05)', color: isRecommended ? '#03ACEA' : '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>View</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }} onClick={() => toggleCompare(compareKey)}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#787776' }}>Compare</span>
                      <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: isCompared ? '2px solid #03ACEA' : '2px solid #C4C3C1', background: isCompared ? '#03ACEA' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {isCompared && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
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

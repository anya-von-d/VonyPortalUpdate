import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { formatMoney } from "@/components/utils/formatMoney";
import SidebarBottomSection from '../components/SidebarBottomSection';
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
    <div className="mesh-layout" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
      <MeshMobileNav user={user} activePage="Loan Help" />

      {/* ── LEFT: Sidebar nav ── */}
      <div className="mesh-left" style={{ background: '#F5F4F0', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
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
                  fontFamily: "'DM Sans', sans-serif",
                  width: '100%', boxSizing: 'border-box',
                }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, background: isActive ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{soonIcons[label]}</span>
                  <span style={{ flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2, flexShrink: 0 }}>SOON</span>
                </Link>
              );
            })}
          </nav>
          <SidebarBottomSection />
        </div>
      </div>

      {/* ── CENTER: Category selector + loan cards ── */}
      <div className="mesh-center" style={{ background: '#F5F4F0', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '24px 48px 80px' }}>

        {/* Desktop: pill nav + active-category grid */}
        <div className="learn-desktop-view">
          {/* Page title */}
          <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 32 }}>Loan Help</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              borderRadius: 16, padding: '5px 8px',
              backdropFilter: 'blur(16px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
              background: 'rgba(255,255,255,0.75)',
              boxShadow: '0px 2px 4px -2px rgba(0,0,0,0.08), 0px 8px 16px -8px rgba(0,0,0,0.03), inset 0px -5px 6px rgba(255,255,255,0.5), inset 0px -8px 24px rgba(255,255,255,0.12)',
            }}>
              {CATEGORIES.map(cat => {
                const active = category === cat.id;
                return (
                  <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
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

          {/* Loan cards grid — 3 columns */}
          <div className="page-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {loans.map((loan, index) => {
              const isRecommended = index === 0;
              const compareKey = `${category}-${loan.name}`;
              const isCompared = compared[compareKey] || false;
              const catLabel = CATEGORIES.find(c => c.id === category)?.label?.toUpperCase();
              return (
                <motion.div key={loan.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} style={{
                  background: 'white',
                  borderRadius: 16,
                  border: isRecommended ? '2px solid #03ACEA' : '1.5px solid rgba(0,0,0,0.08)',
                  boxShadow: isRecommended ? '0 4px 20px rgba(3,172,234,0.13)' : '0 2px 12px rgba(0,0,0,0.07)',
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Card top */}
                  <div style={{ padding: '14px 16px 0' }}>
                    {isRecommended && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#03ACEA', borderRadius: 6, padding: '3px 9px', marginBottom: 9 }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Recommended for you</span>
                      </div>
                    )}
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#B0AFA D', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>{catLabel}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', marginBottom: 3, fontFamily: "'DM Sans', sans-serif" }}>{loan.name}</div>
                    <div style={{ fontSize: 12, color: '#5C5B5A', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>{loan.tagline}</div>
                  </div>
                  {/* Bullets */}
                  <div style={{ padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                    {loan.details.map((line, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: '#C4C3C1', marginTop: 5 }} />
                        <span style={{ fontSize: 12, color: '#5C5B5A', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{line}</span>
                      </div>
                    ))}
                  </div>
                  {/* Footer */}
                  <div style={{ padding: '10px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button style={{ padding: '6px 18px', borderRadius: 20, border: '1.5px solid rgba(0,0,0,0.15)', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'white', color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>View</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => toggleCompare(compareKey)}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Compare</span>
                      <div style={{ width: 15, height: 15, borderRadius: 3, flexShrink: 0, border: isCompared ? '2px solid #03ACEA' : '1.5px solid #C4C3C1', background: isCompared ? '#03ACEA' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {isCompared && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: all categories as titled sections with horizontal scroll */}
        <div className="learn-mobile-sections">
          {CATEGORIES.map(cat => (
            <section key={cat.id} style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', margin: '0 0 12px 0' }}>
                {cat.label}
              </h3>
              <div className="h-scroll-cards">
                {(LOANS[cat.id] || []).map((loan, index) => {
                  const isRecommended = index === 0;
                  const compareKey = `${cat.id}-${loan.name}`;
                  const isCompared = compared[compareKey] || false;
                  return (
                    <div key={loan.name} className="h-scroll-card" style={{
                      background: 'white', borderRadius: 16,
                      border: isRecommended ? '2px solid #03ACEA' : '1.5px solid rgba(0,0,0,0.08)',
                      boxShadow: isRecommended ? '0 4px 20px rgba(3,172,234,0.13)' : '0 2px 12px rgba(0,0,0,0.07)',
                      display: 'flex', flexDirection: 'column',
                    }}>
                      {/* Card top */}
                      <div style={{ padding: '14px 16px 0' }}>
                        {isRecommended && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#03ACEA', borderRadius: 6, padding: '3px 9px', marginBottom: 9 }}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Recommended for you</span>
                          </div>
                        )}
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#B0AFAD', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>{cat.label.toUpperCase()}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1918', marginBottom: 3, fontFamily: "'DM Sans', sans-serif" }}>{loan.name}</div>
                        <div style={{ fontSize: 13, color: '#5C5B5A', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>{loan.tagline}</div>
                      </div>
                      {/* Bullets */}
                      <div style={{ padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                        {loan.details.map((line, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: '#C4C3C1', marginTop: 5 }} />
                            <span style={{ fontSize: 12, color: '#5C5B5A', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{line}</span>
                          </div>
                        ))}
                      </div>
                      {/* Footer */}
                      <div style={{ padding: '10px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button style={{ padding: '7px 18px', borderRadius: 20, border: '1.5px solid rgba(0,0,0,0.15)', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'white', color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>View</button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }} onClick={() => toggleCompare(compareKey)}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Compare</span>
                          <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, border: isCompared ? '2px solid #03ACEA' : '1.5px solid #C4C3C1', background: isCompared ? '#03ACEA' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                            {isCompared && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

    </div>
  );
}

import React, { useState } from "react";
import { motion } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuth } from "@/lib/AuthContext";

const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';

const CATEGORIES = [
  { id: 'student',  label: 'Student Loans' },
  { id: 'credit',   label: 'Credit Cards' },
  { id: 'personal', label: 'Personal Loans' },
  { id: 'auto',     label: 'Auto Loans' },
  { id: 'home',     label: 'Home Loans' },
];

const LOANS = {
  personal: [
    {
      name: 'LightStream',
      tagline: 'Best for excellent credit',
      details: [
        'Rates from 7.99% APR with autopay discount.',
        'No fees of any kind: no origination, no prepayment.',
        'Same-day funding available for qualified borrowers.',
      ],
    },
    {
      name: 'Marcus by Goldman Sachs',
      tagline: 'Best for no-fee borrowing',
      details: [
        'Fixed rates with zero fees, ever. Borrow $3,500 to $40,000.',
        'Choose a repayment term from 36 to 72 months.',
        'On-time payment reward: skip a month after 12 consecutive payments.',
      ],
    },
    {
      name: 'SoFi Personal',
      tagline: 'Best for career-focused borrowers',
      details: [
        'Unemployment protection if you lose your job mid-loan.',
        'Rate discounts for autopay and existing SoFi members.',
        'No origination fees, no prepayment penalties.',
      ],
    },
    {
      name: 'Upstart',
      tagline: 'Best for thin credit files',
      details: [
        'AI underwriting considers education and career history.',
        'Accessible to borrowers with limited credit history.',
        'Next-business-day funding for most approved applicants.',
      ],
    },
    {
      name: 'Discover Personal',
      tagline: 'Best for flexible repayment',
      details: [
        '30-day money-back guarantee: return funds, pay no interest.',
        'No origination fee. Terms from 36 to 84 months.',
        'Direct payment to creditors available for debt consolidation.',
      ],
    },
    {
      name: 'Avant',
      tagline: 'Best for fair credit borrowers',
      details: [
        'Rates from 9.95% APR, designed for fair to good credit profiles.',
        'Loan amounts from $2,000 to $35,000. Terms from 24 to 60 months.',
        'Fast decisions: most applicants hear back the same business day.',
      ],
    },
  ],
  student: [
    {
      name: 'Earnest',
      tagline: 'Best for flexible repayment',
      details: [
        'Precision pricing: set your exact monthly payment.',
        'No late fees, no origination fees, no prepayment penalties.',
        'Skip one payment per year if your finances change.',
      ],
    },
    {
      name: 'SoFi Student',
      tagline: 'Best for grad students',
      details: [
        'Career coaching and job placement support included.',
        'Unemployment protection if you lose your job after graduation.',
        'Rates from 4.99% APR for qualifying borrowers.',
      ],
    },
    {
      name: 'College Ave',
      tagline: 'Best for customisable terms',
      details: [
        'Choose repayment terms of 5, 8, 10, or 15 years.',
        'Covers 100% of school-certified costs. No max loan cap.',
        'Multi-year approval available so you only apply once.',
      ],
    },
    {
      name: 'Sallie Mae',
      tagline: 'Best for undergrad borrowers',
      details: [
        '12-month interest-only grace period after graduation.',
        'Covers undergrad, grad, and professional degrees.',
        'Cosigner release available after 12 on-time payments.',
      ],
    },
    {
      name: 'LendKey',
      tagline: 'Best for credit union rates',
      details: [
        'Community bank and credit union rates, bank convenience.',
        'No application or origination fees. Transparent pricing.',
        'Dedicated local support through your lending institution.',
      ],
    },
    {
      name: 'ELFI',
      tagline: 'Best for refinancing student loans',
      details: [
        'Specialist refinancer with rates from 4.86% APR.',
        'Dedicated student loan advisors for every applicant.',
        'Refinance federal and private loans into a single payment.',
      ],
    },
  ],
  credit: [
    {
      name: 'Chase Sapphire Preferred',
      tagline: 'Best for travel rewards',
      details: [
        '3x points on dining, 2x on travel. 60,000-point welcome bonus.',
        '$95 annual fee offset by $50 annual hotel credit.',
        'No foreign transaction fees. Transfer to 14 airline partners.',
      ],
    },
    {
      name: 'Citi Double Cash',
      tagline: 'Best no-annual-fee card',
      details: [
        'Unlimited 2% cash back: 1% when you buy, 1% when you pay.',
        'No annual fee. No rotating categories to track.',
        '0% intro APR on balance transfers for 18 months.',
      ],
    },
    {
      name: 'Amex Blue Cash Preferred',
      tagline: 'Best for everyday spending',
      details: [
        '6% back at US supermarkets (up to $6,000/year), 3% on gas.',
        '3% back on transit: taxis, rideshares, parking, tolls.',
        '$250 statement credit after $3,000 in purchases in 6 months.',
      ],
    },
    {
      name: 'Capital One Venture',
      tagline: 'Best for flat-rate miles',
      details: [
        'Unlimited 2x miles on every purchase, every day.',
        'Transfer miles to 15+ airline and hotel loyalty programmes.',
        '75,000-mile welcome bonus after $4,000 spend in 3 months.',
      ],
    },
    {
      name: 'Discover it Cash Back',
      tagline: 'Best for first-year value',
      details: [
        '5% cash back in rotating quarterly categories (up to $1,500).',
        'Discover matches all cash back earned in your first year.',
        'No annual fee, no foreign transaction fees.',
      ],
    },
    {
      name: 'Wells Fargo Active Cash',
      tagline: 'Best for flat-rate cash back',
      details: [
        'Unlimited 2% cash rewards on every purchase, no categories.',
        '$200 welcome bonus after $500 spend in the first 3 months.',
        '0% intro APR for 15 months on purchases and balance transfers.',
      ],
    },
  ],
  auto: [
    {
      name: 'PenFed Credit Union',
      tagline: 'Best for new vehicles',
      details: [
        'Rates from 4.74% APR on new vehicles. Pre-approval in minutes.',
        'No application fee. Decisions within one business day.',
        'Membership open to everyone, no military affiliation required.',
      ],
    },
    {
      name: 'LightStream Auto',
      tagline: 'Best for rate guarantee',
      details: [
        'Rate-beat programme: 0.10% below any competitor offer.',
        'No restrictions on vehicle age, mileage, or make.',
        'Same-day funding. No down payment required.',
      ],
    },
    {
      name: 'Capital One Auto',
      tagline: 'Best for dealership network',
      details: [
        'Pre-qualify online without a hard credit pull.',
        'Access to 12,000+ participating dealerships nationwide.',
        'Finance new, used, or refinance an existing loan.',
      ],
    },
    {
      name: 'Autopay',
      tagline: 'Best for refinancing',
      details: [
        'Refinancing specialist. Average customer saves $1,600/year.',
        'Compare quotes from multiple lenders in one application.',
        'Rate-lock guarantee holds your offer for 30 days.',
      ],
    },
    {
      name: 'Bank of America Auto',
      tagline: 'Best for existing customers',
      details: [
        'Preferred Rewards members get up to 0.50% rate reduction.',
        'Fast online approval. Finance vehicles up to 10 years old.',
        'Flexible terms from 12 to 75 months.',
      ],
    },
    {
      name: 'myAutoLoan',
      tagline: 'Best for loan comparison',
      details: [
        'Compare offers from up to four lenders in a single application.',
        'Rates as low as 1.99% APR for well-qualified buyers.',
        'Works for new, used, and private party vehicle purchases.',
      ],
    },
  ],
  home: [
    {
      name: 'Rocket Mortgage',
      tagline: 'Best for digital experience',
      details: [
        'Fully online application with live mortgage advisors on call.',
        'Average closing in 26 days, industry-leading turnaround.',
        'Customise your rate by adjusting points at application.',
      ],
    },
    {
      name: 'Better.com',
      tagline: 'Best for no-fee mortgages',
      details: [
        'No commission agents, no origination fee, no lender fees.',
        'Instant loan estimates without affecting your credit score.',
        'Pre-approval letter in as little as 3 minutes.',
      ],
    },
    {
      name: 'loanDepot',
      tagline: 'Best for in-person support',
      details: [
        'Fixed and adjustable rates with in-person support nationwide.',
        'Lifetime Guarantee: refinance at no lender fee after closing.',
        'Specialises in jumbo and self-employed borrower programmes.',
      ],
    },
    {
      name: 'Guild Mortgage',
      tagline: 'Best for first-time buyers',
      details: [
        'First-time buyer programmes with down payment assistance.',
        'Available in all 50 states with dedicated local advisors.',
        'Minimum 600 credit score accepted on select programmes.',
      ],
    },
    {
      name: 'Chase Home Lending',
      tagline: 'Best for Chase customers',
      details: [
        'Rate discount of up to 0.25% for Chase relationship customers.',
        'Jumbo loans available up to $9.5 million.',
        'Dedicated mortgage banker assigned throughout the process.',
      ],
    },
    {
      name: 'Veterans United',
      tagline: 'Best for VA loan borrowers',
      details: [
        'Specialist in VA loans with no down payment required.',
        'Top-rated customer service: 4.9 stars across 250,000+ reviews.',
        'Free credit counselling for buyers not yet VA loan ready.',
      ],
    },
  ],
};

export default function LoanHelp() {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const [category, setCategory] = useState('student');
  const [compared, setCompared] = useState({});

  const toggleCompare = (key) => setCompared(prev => ({ ...prev, [key]: !prev[key] }));
  const loans = LOANS[category] || [];

  return (
    <div className="home-with-sidebar" style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingTop: 0, background: 'transparent' }}>
      <DashboardSidebar activePage="LoanHelp" user={user} />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 40px', background: 'transparent', position: 'relative', zIndex: 2 }}>

        {/* Hero title */}
        <div style={{ margin: '8px 10px 0', height: 168, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24, position: 'relative' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 1200 168" preserveAspectRatio="xMidYMid slice">
            {[{cx:80,cy:40},{cx:200,cy:110},{cx:320,cy:25},{cx:430,cy:160},{cx:540,cy:70},{cx:660,cy:130},{cx:770,cy:35},{cx:890,cy:175},{cx:1000,cy:80},{cx:1100,cy:140},{cx:150,cy:185},{cx:480,cy:100},{cx:720,cy:180},{cx:950,cy:55},{cx:280,cy:195},{cx:620,cy:48},{cx:1050,cy:195}].map((s, i) => (
              <circle key={i} cx={s.cx} cy={s.cy} r={i % 3 === 0 ? 2.5 : 1.5} fill="white" />
            ))}
          </svg>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 40, fontWeight: 600, color: '#1A1918', margin: 0, letterSpacing: '-0.01em', lineHeight: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <span style={{ fontStyle: 'normal' }}>Loan Help</span>
          </h1>
        </div>

        {/* Page content */}
        <div className="dashboard-content-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 0 64px', position: 'relative', zIndex: 1 }}>

          {/* Category selector bar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 14, padding: 4, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    fontWeight: category === cat.id ? 700 : 400,
                    color: category === cat.id ? '#1A1918' : '#5C5B5A',
                    background: category === cat.id ? 'white' : 'transparent',
                    boxShadow: category === cat.id ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loan cards grid — 2 columns, 6 cards = 3 rows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {loans.map((loan, index) => {
              const isRecommended = index === 0;
              const compareKey = `${category}-${loan.name}`;
              const isCompared = compared[compareKey] || false;

              return (
                <motion.div
                  key={loan.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    background: isRecommended ? '#03ACEA' : '#F4F4F5',
                    borderRadius: 18,
                    boxShadow: SHADOW,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Card header */}
                  <div style={{ padding: '6px 14px 5px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isRecommended ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                          Recommended for You
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                        {CATEGORIES.find(c => c.id === category)?.label}
                      </span>
                    )}
                  </div>

                  {/* White inner panel */}
                  <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 14, padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>

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

                    {/* View + Compare row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <button style={{
                        padding: '6px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 600,
                        background: isRecommended ? '#03ACEA' : 'rgba(0,0,0,0.06)',
                        color: isRecommended ? 'white' : '#1A1918',
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                        View
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }} onClick={() => toggleCompare(compareKey)}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#787776' }}>Compare</span>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                          border: isCompared ? '2px solid #03ACEA' : '2px solid #C4C3C1',
                          background: isCompared ? '#03ACEA' : 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {isCompared && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>

        {/* Footer — matches Learn page */}
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

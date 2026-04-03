import React, { useState } from "react";
import {
  Sparkles, Shield, Zap, BarChart3, FileCheck, Users,
  BookOpen, Scale, Heart, Receipt, Brain, Landmark,
  ChevronRight, Lock
} from "lucide-react";
import { motion } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuth } from "@/lib/AuthContext";

const STAR_CIRCLES = [
  {cx:82,cy:45,o:0.7},{cx:195,cy:112,o:0.5},{cx:310,cy:28,o:0.8},{cx:420,cy:198,o:0.4},
  {cx:530,cy:67,o:0.65},{cx:640,cy:245,o:0.55},{cx:755,cy:88,o:0.75},{cx:860,cy:156,o:0.45},
  {cx:970,cy:34,o:0.7},{cx:1085,cy:201,o:0.6},{cx:1190,cy:78,o:0.5},{cx:1300,cy:267,o:0.7},
  {cx:1410,cy:45,o:0.55},{cx:1520,cy:134,o:0.65},{cx:48,cy:189,o:0.4},{cx:158,cy:278,o:0.6},
  {cx:268,cy:156,o:0.5},{cx:378,cy:89,o:0.7},{cx:488,cy:234,o:0.45},{cx:598,cy:145,o:0.6},
  {cx:708,cy:312,o:0.35},{cx:818,cy:56,o:0.75},{cx:928,cy:223,o:0.5},{cx:1038,cy:98,o:0.65},
  {cx:1148,cy:289,o:0.4},{cx:1258,cy:167,o:0.7},{cx:1368,cy:234,o:0.55},{cx:1478,cy:78,o:0.6},
  {cx:1560,cy:256,o:0.45},{cx:125,cy:312,o:0.5},{cx:345,cy:267,o:0.6},{cx:565,cy:34,o:0.75},
];

const products = [
  {
    icon: Sparkles,
    name: "Vony+",
    tagline: "Premium",
    description: "Detailed loan analytics, priority support, and higher lending limits for power users.",
    highlights: ["Advanced repayment insights", "Priority dispute resolution", "Up to $25k lending limit"],
    color: '#A79DEA',
  },
  {
    icon: BarChart3,
    name: "Credit Builder",
    tagline: "Track Record",
    description: "Build a verified lending history on Vony that shows you're trustworthy with money.",
    highlights: ["Verified lending score", "Shareable trust profile", "Repayment history export"],
    color: '#678AFB',
  },
  {
    icon: Zap,
    name: "Instant Transfer",
    tagline: "Speed",
    description: "Send and receive loan payments instantly instead of waiting for bank transfers.",
    highlights: ["Real-time payments", "No transfer delays", "Works with any bank"],
    color: '#A79DEA',
  },
  {
    icon: FileCheck,
    name: "Smart Agreements",
    tagline: "AI-Powered",
    description: "Auto-generated loan agreements tailored to your terms, ready to sign and share.",
    highlights: ["Custom clauses", "Digital signatures", "Legal templates"],
    color: '#678AFB',
  },
  {
    icon: Users,
    name: "Group Pools",
    tagline: "Community",
    description: "Pool money with friends for shared goals — trips, gifts, or emergency funds.",
    highlights: ["Transparent contributions", "Automatic splits", "Group dashboard"],
    color: '#A79DEA',
  },
  {
    icon: Shield,
    name: "Payment Protection",
    tagline: "Safety Net",
    description: "Optional coverage that protects lenders if a borrower misses payments.",
    highlights: ["Missed payment coverage", "Flexible plans", "Automated claims"],
    color: '#678AFB',
  },
];

const guides = [
  {
    icon: Scale,
    title: "Setting Fair Interest Rates",
    description: "What's reasonable when lending to friends? Learn how to set rates that are fair to both sides without making things awkward.",
    readTime: "4 min read",
    color: '#678AFB',
  },
  {
    icon: FileCheck,
    title: "Writing a Loan Agreement That Works",
    description: "The key terms every peer loan should include — amount, schedule, what happens if things change — and how to bring it up naturally.",
    readTime: "5 min read",
    color: '#A79DEA',
  },
  {
    icon: Heart,
    title: "When a Friend Can't Pay You Back",
    description: "How to have the conversation, renegotiate terms, and protect the relationship when repayment stalls.",
    readTime: "6 min read",
    color: '#678AFB',
  },
  {
    icon: Receipt,
    title: "Tax Implications of Peer Lending",
    description: "What the IRS expects when you lend or borrow over $10k, how gift rules apply, and when interest income matters.",
    readTime: "5 min read",
    color: '#A79DEA',
  },
  {
    icon: Brain,
    title: "The Psychology of Lending to Friends",
    description: "Why money changes relationships, how to set boundaries without guilt, and when it's okay to say no.",
    readTime: "4 min read",
    color: '#678AFB',
  },
  {
    icon: Landmark,
    title: "Building Your Lending Track Record",
    description: "How consistent, on-time payments and responsible lending on Vony build trust with your network over time.",
    readTime: "3 min read",
    color: '#A79DEA',
  },
];

export default function ComingSoon() {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const [activeTab, setActiveTab] = useState('shop');

  return (
    <div className="home-with-sidebar" style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240, background: '#F5F4F0' }}>
      <DashboardSidebar activePage="ComingSoon" user={user} />

      <div className="content-box-glow" style={{ position: 'relative', margin: '20px 12px 12px 0', borderRadius: 24, overflow: 'hidden', minHeight: 'calc(100vh - 32px)', border: '6px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'rgba(0,0,0,0.03) 0px 0.6px 2.3px -0.42px, rgba(0,0,0,0.04) 0px 2.3px 8.7px -0.83px, rgba(0,0,0,0.08) 0px 10px 38px -1.25px' }}>
        {/* Background */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: 0, left: '-10%', width: '120%', height: '100%', zIndex: 0,
            background: '#6587F9'
          }} />
        </div>

        <div style={{ background: 'transparent', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px' }}>
            {/* Hero */}
            <div style={{ paddingTop: 80, paddingBottom: 20, textAlign: 'center' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '3.2rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#1A1918', margin: 0 }}>
                Coming Soon
              </h1>
            </div>

            {/* Glass tab selector */}
            <div className="glass-nav" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: '6px 24px', height: 48, margin: '0 auto 36px', maxWidth: 320, zIndex: 10 }}>
              {[{key:'shop',label:'Shop'},{key:'learn',label:'Learn'}].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 500, color: activeTab === tab.key ? '#1A1918' : '#787776', background: activeTab === tab.key ? 'rgba(0,0,0,0.06)' : 'transparent', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page content */}
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px' }}>

            {/* ═══ Shop Tab ═══ */}
            {activeTab === 'shop' && (
              <div>
                {/* Intro card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card"
                  style={{ padding: '24px 28px', marginBottom: 20 }}
                >
                  <span style={{ fontSize: 11, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace" }}>
                    What We're Building
                  </span>
                  <p style={{ fontSize: 14, color: '#5C5B5A', margin: '10px 0 0', lineHeight: 1.6 }}>
                    New tools to make lending between friends simpler, safer, and smarter. These features are in development — we'll notify you when they launch.
                  </p>
                </motion.div>

                {/* Products grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {products.map((product, index) => (
                    <motion.div
                      key={product.name}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 + index * 0.06 }}
                      className="glass-card"
                      style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${product.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <product.icon size={20} style={{ color: product.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>{product.name}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: product.color, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'IBM Plex Mono', monospace" }}>{product.tagline}</span>
                          </div>
                        </div>
                      </div>

                      <p style={{ fontSize: 13, color: '#5C5B5A', lineHeight: 1.55, margin: '0 0 16px' }}>
                        {product.description}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                        {product.highlights.map((h, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: product.color, flexShrink: 0, opacity: 0.6 }} />
                            <span style={{ fontSize: 12, color: '#787776' }}>{h}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: 'auto' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px', borderRadius: 10,
                          background: 'rgba(0,0,0,0.03)', fontSize: 11, fontWeight: 600,
                          color: '#787776', fontFamily: "'DM Sans', sans-serif",
                        }}>
                          <Lock size={12} />
                          Coming Soon
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ Learn Tab ═══ */}
            {activeTab === 'learn' && (
              <div>
                {/* Intro card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card"
                  style={{ padding: '24px 28px', marginBottom: 20 }}
                >
                  <span style={{ fontSize: 11, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace" }}>
                    Guides & Resources
                  </span>
                  <p style={{ fontSize: 14, color: '#5C5B5A', margin: '10px 0 0', lineHeight: 1.6 }}>
                    Practical advice for lending and borrowing between friends — from setting terms to navigating tough conversations.
                  </p>
                </motion.div>

                {/* Guides list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {guides.map((guide, index) => (
                    <motion.div
                      key={guide.title}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 + index * 0.06 }}
                      className="glass-card"
                      style={{ padding: '22px 26px', cursor: 'default' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${guide.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                          <guide.icon size={20} style={{ color: guide.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>{guide.title}</span>
                            <span style={{ fontSize: 10, color: '#787776', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>{guide.readTime}</span>
                          </div>
                          <p style={{ fontSize: 13, color: '#5C5B5A', lineHeight: 1.55, margin: '0 0 12px' }}>
                            {guide.description}
                          </p>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 10,
                            background: 'rgba(0,0,0,0.03)', fontSize: 11, fontWeight: 600,
                            color: '#787776', fontFamily: "'DM Sans', sans-serif",
                          }}>
                            <Lock size={12} />
                            Coming Soon
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>{/* end content box */}

      {/* Footer */}
      <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 11, color: '#787776' }}>Terms of Service</span>
          <span style={{ fontSize: 11, color: '#787776' }}>Privacy Center</span>
          <span style={{ fontSize: 11, color: '#787776' }}>Do not sell or share my personal information</span>
        </div>
      </div>
    </div>
  );
}

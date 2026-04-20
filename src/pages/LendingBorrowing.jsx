import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import YourLoans from './YourLoans';

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LendingBorrowing() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'lending';
  const setTab = (t) => setSearchParams({ tab: t });

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#FAFAF8', color: '#1A1918' }}>
      <MeshMobileNav activePage="LendingBorrowing" />

      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '176px 1fr', gap: 0 }}>
        <DesktopSidebar />

        <div className="mesh-center" style={{ padding: '40px 32px 80px', maxWidth: 720, margin: '0 auto', width: '100%' }}>

          {/* ── Title ── */}
          <h1 style={{
            textAlign: 'center', fontSize: 26, fontWeight: 800,
            color: '#1A1918', letterSpacing: '-0.04em', lineHeight: 1.1,
            marginBottom: 28, fontFamily: "'DM Sans', sans-serif",
          }}>
            Lending &amp; Borrowing
          </h1>

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 36 }}>
            {/* Create Loan — light pill */}
            <button
              onClick={() => navigate(createPageUrl('CreateOffer'))}
              style={{
                height: 52, borderRadius: 40, fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '-0.01em', transition: 'opacity 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                paddingLeft: 28, paddingRight: 28,
                flex: 1, maxWidth: 220,
                background: '#ffffff',
                color: '#1A1918',
                border: '2px solid #1A1918',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              Create Loan
            </button>

            {/* Log Payment — dark pill */}
            <button
              onClick={() => navigate(createPageUrl('RecordPayment'))}
              style={{
                height: 52, borderRadius: 40, fontSize: 15, fontWeight: 700,
                cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '-0.01em', transition: 'opacity 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                paddingLeft: 28, paddingRight: 28,
                flex: 1, maxWidth: 220,
                background: '#1A1918',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              }}
            >
              Log Payment
            </button>
          </div>

          {/* ── Tab nav ── */}
          <div style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { key: 'lending',   label: 'Lending' },
                { key: 'borrowing', label: 'Borrowing' },
              ].map(({ key, label }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    style={{
                      position: 'relative',
                      flex: 1,
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '12px 0 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <span style={{
                      fontSize: 16, fontWeight: active ? 700 : 500,
                      color: active ? '#1A1918' : '#9B9A98',
                      letterSpacing: '-0.02em',
                      transition: 'color 0.15s, font-weight 0.15s',
                    }}>
                      {label}
                    </span>
                    {/* Active underline */}
                    {active && (
                      <div
                        style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          height: 3, borderRadius: 2, background: '#1A1918',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Full-width separator */}
            <div style={{ height: 1, background: '#E8E7E5' }} />
          </div>

          {/* ── Tab content ── */}
          <YourLoans embeddedMode defaultTab={activeTab} />

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

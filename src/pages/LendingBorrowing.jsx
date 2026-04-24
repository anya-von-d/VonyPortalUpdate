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
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: 'transparent', color: '#1A1918' }}>
      <MeshMobileNav activePage="LendingBorrowing" />

      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '176px 1fr', gap: 0 }}>
        <DesktopSidebar />

        <div className="mesh-center" style={{ padding: '24px 56px 80px', width: '100%' }}>

          {/* Desktop title */}
          <div className="desktop-page-title" style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, color: '#1A1918' }}>
              Lending &amp; Borrowing
            </div>
          </div>

          {/* Mobile title */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Lending &amp; Borrowing</div>
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, justifyContent: 'center' }}>
            <button
              onClick={() => navigate(createPageUrl('CreateOffer'))}
              style={{
                height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '-0.01em', transition: 'opacity 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                paddingLeft: 20, paddingRight: 20,
                background: '#ffffff', color: '#1A1918',
                border: '1.5px solid rgba(0,0,0,0.15)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              Create Loan
            </button>
            <button
              onClick={() => navigate(createPageUrl('RecordPayment'))}
              style={{
                height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '-0.01em', transition: 'opacity 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                paddingLeft: 20, paddingRight: 20,
                background: '#1A1918', color: '#ffffff',
              }}
            >
              Log Payment
            </button>
          </div>

          {/* ── Tab nav — same style as Records page ── */}
          <div style={{ marginBottom: 20 }}>
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
                      padding: '10px 0 12px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14, fontWeight: active ? 700 : 500,
                      color: active ? '#1A1918' : '#9B9A98',
                      letterSpacing: '-0.02em',
                      transition: 'color 0.15s',
                    }}
                  >
                    {label}
                    {active && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: 2, borderRadius: 2, background: '#1A1918',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
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

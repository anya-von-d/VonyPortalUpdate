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

        <div className="mesh-center" style={{ padding: '24px 48px 80px', minWidth: 0 }}>

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

          {/* ── Tab nav — pill/segmented style ── */}
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'inline-flex', background: '#F0F0EE', borderRadius: 12, padding: 3, gap: 2 }}>
              {[
                { key: 'lending',   label: 'Lending' },
                { key: 'borrowing', label: 'Borrowing' },
              ].map(({ key, label }) => {
                const active = activeTab === key;
                return (
                  <button key={key} onClick={() => setTab(key)} style={{
                    padding: '7px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: active ? 'white' : 'transparent',
                    color: active ? '#1A1918' : '#787776',
                    fontSize: 13, fontWeight: active ? 600 : 500,
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: '-0.01em',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Tab content ── */}
          <YourLoans embeddedMode defaultTab={activeTab} />

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'center' }}>
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

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useDemoMode } from '@/lib/DemoModeContext';

/**
 * Global modal shown when demo-mode code tries to perform a write. Entity
 * write methods in /src/entities/all.js dispatch a `vony-demo-blocked`
 * CustomEvent which this listener catches.
 */
export default function DemoBlockedModal() {
  const [open, setOpen] = useState(false);
  const { toggleDemoMode } = useDemoMode();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('vony-demo-blocked', handler);
    return () => window.removeEventListener('vony-demo-blocked', handler);
  }, []);

  if (!open) return null;

  const close = () => setOpen(false);

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FEFEFE',
          borderRadius: 4,
          boxShadow: '5px 4px 18px rgba(0,0,0,0.14), -1px 0 0 rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.12)',
          padding: '28px 24px 22px',
          maxWidth: 360, width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(3,172,234,0.12)', color: '#03ACEA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1918', marginBottom: 8, letterSpacing: '-0.01em' }}>
          Demo Mode
        </div>
        <div style={{ fontSize: 13, color: '#4B4A48', lineHeight: 1.5, marginBottom: 20 }}>
          This feature is not available in demo mode. To make changes to your
          data make sure to exit demo mode.
        </div>
        <button
          type="button"
          onClick={() => { close(); toggleDemoMode(); }}
          style={{
            width: '100%',
            background: '#54A6CF', color: '#fff',
            border: 'none', borderRadius: 10,
            padding: '11px 14px',
            fontSize: 13, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer', letterSpacing: '-0.01em',
            marginBottom: 8,
          }}
        >
          Exit Demo Mode
        </button>
        <button
          type="button"
          onClick={close}
          style={{
            width: '100%',
            background: 'transparent', color: '#787776',
            border: 'none',
            padding: '8px 14px',
            fontSize: 12, fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
          }}
        >
          Stay in demo mode
        </button>
      </div>
    </div>
  );
}

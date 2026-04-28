import { useDemoMode } from '@/lib/DemoModeContext';

/**
 * Demo Mode toggle — label + iOS-style slider.
 * Matches the nav "Records" label style (DM Sans 13, weight 500/600).
 * Slider turns blue (#03ACEA) when active.
 */
export default function DemoModeToggle({ variant = 'desktop' }) {
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  const labelStyle = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: isDemoMode ? 600 : 500,
    color: isDemoMode ? '#1A1918' : 'rgba(0,0,0,0.55)',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const trackStyle = {
    position: 'relative',
    width: 32,
    height: 18,
    borderRadius: 999,
    background: isDemoMode ? '#03ACEA' : 'rgba(0,0,0,0.22)',
    transition: 'background 0.18s ease',
    flexShrink: 0,
    boxShadow: isDemoMode ? '0 0 0 1px rgba(3,172,234,0.3)' : 'inset 0 0 0 1px rgba(0,0,0,0.06)',
  };

  const knobStyle = {
    position: 'absolute',
    top: 2,
    left: isDemoMode ? 16 : 2,
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    transition: 'left 0.18s ease',
  };

  const wrapperStyle = variant === 'mobile'
    ? {
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,0,0,0.10)',
        borderRadius: 999,
        boxShadow: '0 2px 12px rgba(0,0,0,0.13)',
        cursor: 'pointer',
        pointerEvents: 'auto',
      }
    : variant === 'profile'
    ? {
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '6px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
      }
    : {
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        background: 'rgba(255,255,255,0.38)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.28)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        borderRadius: 30,
        cursor: 'pointer',
        pointerEvents: 'auto',
      };

  return (
    <button
      type="button"
      onClick={toggleDemoMode}
      aria-pressed={isDemoMode}
      style={{ ...wrapperStyle, border: wrapperStyle.border, outline: 'none' }}
    >
      <span style={labelStyle}>Demo Mode</span>
      <span style={trackStyle}>
        <span style={knobStyle} />
      </span>
    </button>
  );
}

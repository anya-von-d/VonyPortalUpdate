import { createPortal } from 'react-dom';
import { useEffect } from 'react';

/* ── Barcode: deterministic stripes from payment ID ── */
function Barcode({ id }) {
  const source = (id || 'vony').replace(/-/g, '');
  let bars = [];
  let x = 0;
  for (let i = 0; i < Math.min(source.length, 36); i++) {
    const v = parseInt(source[i], 16);
    const w = i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1.2;
    const h = 18 + (v % 18);
    bars.push({ x, w, h });
    x += w + (i % 4 === 0 ? 3 : 1.5);
  }
  const totalW = x;
  return (
    <svg viewBox={`0 0 ${totalW} 40`} height="40" width="100%" style={{ display: 'block' }}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={(40 - b.h) / 2} width={b.w} height={b.h}
          fill="#1A1918" rx="0.4" />
      ))}
    </svg>
  );
}

/* ── Scalloped perforation edge ── */
function ScallopEdge() {
  return (
    <div style={{ background: '#1A1918', height: 14, flexShrink: 0 }}>
      <svg width="100%" height="14" viewBox="0 0 340 14"
        preserveAspectRatio="none" style={{ display: 'block' }}>
        {Array.from({ length: 22 }, (_, i) => (
          <circle key={i} cx={i * (340 / 21) + 340 / 42} cy={14} r={8} fill="white" />
        ))}
      </svg>
    </div>
  );
}

/* ── Receipt line row ── */
function Row({ label, value, header, bold, muted, valueColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', gap: 12,
      padding: header ? '0 0 8px' : '5px 0',
      borderBottom: header ? '1px solid rgba(0,0,0,0.10)' : 'none',
    }}>
      <span style={{
        fontSize: header ? 10 : 12,
        fontWeight: header ? 700 : bold ? 700 : 400,
        color: header ? 'rgba(0,0,0,0.35)' : muted ? '#787776' : '#1A1918',
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: header ? '0.06em' : '0',
        textTransform: header ? 'uppercase' : 'none',
        flexShrink: 0,
      }}>{label}</span>
      <span style={{
        fontSize: header ? 10 : bold ? 14 : 12,
        fontWeight: header ? 700 : bold ? 700 : 500,
        color: valueColor || (header ? 'rgba(0,0,0,0.35)' : '#1A1918'),
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: header ? '0.06em' : '0',
        textTransform: header ? 'uppercase' : 'none',
        textAlign: 'right', maxWidth: '55%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</span>
    </div>
  );
}

export default function PaymentReceiptModal({ data, onClose }) {
  if (!data) return null;

  const {
    amount, date, method, notes, status, id,
    fromName, toName, purpose, loanTotal,
    isSender,
  } = data;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const fmtDate = date
    ? new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : '—';

  const fmtTime = date
    ? new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  const statusLabel = status === 'completed' ? 'Confirmed' :
    status === 'pending_confirmation' ? 'Pending confirmation' :
    status === 'rejected' ? 'Rejected' : status || 'Completed';

  const statusColor = status === 'completed' ? '#16A34A' :
    status === 'pending_confirmation' ? '#8B5CF6' :
    status === 'rejected' ? '#E8726E' : '#16A34A';

  const fmtAmount = typeof amount === 'number'
    ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(amount || '0.00');

  const shortId = (id || '').toUpperCase().replace(/-/g, '').slice(0, 16);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      {/* Receipt card — stop propagation so clicking inside doesn't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 340,
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.18)',
          fontFamily: "'DM Sans', sans-serif",
          position: 'relative',
        }}
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 10,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* ── Dark header ── */}
        <div style={{ background: '#1A1918', padding: '22px 28px 20px' }}>
          {/* Logo + date */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <span style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic', fontWeight: 600, fontSize: '1.35rem',
              color: 'white', letterSpacing: '-0.02em', lineHeight: 1,
            }}>Vony</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
              {fmtDate}
            </span>
          </div>

          {/* Amount — centred */}
          <div style={{ textAlign: 'center', paddingBottom: 4 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              {isSender ? 'Payment sent' : 'Payment received'}
            </div>
            <div style={{ fontSize: 46, fontWeight: 700, color: 'white', letterSpacing: '-0.04em', lineHeight: 1 }}>
              ${fmtAmount}
            </div>
            {fmtTime && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6, letterSpacing: '0.02em' }}>
                {fmtTime}
              </div>
            )}
          </div>
        </div>

        {/* ── Scalloped perforation ── */}
        <ScallopEdge />

        {/* ── White body ── */}
        <div style={{ background: 'white', padding: '18px 28px 24px' }}>
          <Row label="Description" value="Amount" header />
          <Row label="From" value={fromName} />
          <Row label="To" value={toName} />
          {purpose && <Row label="Purpose" value={purpose} />}
          {loanTotal && (
            <Row label="Loan total" value={`$${Number(loanTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} muted />
          )}
          {method && <Row label="Method" value={method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ')} />}
          {notes && <Row label="Notes" value={notes} />}
          <Row label="Status" value={statusLabel} valueColor={statusColor} />

          {/* Total */}
          <div style={{ margin: '12px 0 4px', borderTop: '1px solid rgba(0,0,0,0.09)' }} />
          <Row label="Total" value={`$${fmtAmount}`} bold />

          {/* Dashed separator */}
          <div style={{
            margin: '16px -28px 14px',
            borderTop: '1.5px dashed rgba(0,0,0,0.12)',
          }} />

          {/* Barcode */}
          <Barcode id={id} />
          <div style={{
            textAlign: 'center', fontSize: 9, color: 'rgba(0,0,0,0.25)',
            marginTop: 5, letterSpacing: '0.14em', fontFamily: 'monospace',
          }}>
            {shortId || 'VONY-RECEIPT'}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

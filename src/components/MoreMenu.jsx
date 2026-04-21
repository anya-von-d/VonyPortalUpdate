import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

/**
 * MoreMenu — generic three-dots button that opens a small popover menu.
 *
 * Props:
 *   items  {Array<{ label, onClick, danger?: boolean }>}
 *   size   {number}   icon size (default 14)
 *   align  {'left'|'right'} popover horizontal alignment (default 'right')
 */
export default function MoreMenu({ items = [], size = 14, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label="More options"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 3, color: open ? '#1A1918' : '#9B9A98',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 6,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#1A1918'}
        onMouseLeave={e => e.currentTarget.style.color = open ? '#1A1918' : '#9B9A98'}
      >
        <MoreHorizontal size={size} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)',
            [align]: 0,
            background: 'white', borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000, minWidth: 130, overflow: 'hidden',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick?.(); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', border: 'none', background: 'white',
                fontSize: 12, fontWeight: 500,
                color: item.danger ? '#E8726E' : '#1A1918',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f4f0'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

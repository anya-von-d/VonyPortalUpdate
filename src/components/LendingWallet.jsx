import React from "react";
import { formatMoney } from "@/components/utils/formatMoney";

/**
 * Compact square wallet card — white card style matching the rest of the app.
 * Shows up to 3 loan-chip rows (stacked) then the total amount below.
 */
export default function LendingWallet({ cards, label, amount, sublabel }) {
  const CHIP_COLORS = [
    { bg: '#EBF4FA', border: 'rgba(3,172,234,0.18)', name: '#5B9EC9', val: '#1A1918' },
    { bg: '#F0EDF8', border: 'rgba(124,58,237,0.15)', name: '#7C5AB8', val: '#1A1918' },
    { bg: '#FEFCE8', border: 'rgba(202,138,4,0.18)',  name: '#A37D10', val: '#1A1918' },
  ];

  const padded = [...cards.slice(0, 3)];
  while (padded.length < 3) padded.push(null);

  return (
    <div style={{
      width: 182,
      background: '#ffffff',
      borderRadius: 16,
      border: '1px solid #ECEAE8',
      boxShadow: '0 2px 10px rgba(0,0,0,0.055), 0 1px 3px rgba(0,0,0,0.04)',
      padding: '14px 15px 15px',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
    }}>

      {/* Card chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {padded.map((card, i) => {
          const c = CHIP_COLORS[i];
          return (
            <div key={i} style={{
              height: 33, borderRadius: 8,
              background: c.bg,
              border: `1px solid ${c.border}`,
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 10px',
              gap: 6,
            }}>
              {/* Tiny chip indicator */}
              <div style={{ width: 14, height: 10, borderRadius: 2, background: 'linear-gradient(135deg, #D4AF37 0%, #A37F10 100%)', flexShrink: 0 }} />
              {card ? (
                <>
                  <span style={{ fontSize: 10, fontWeight: 600, color: c.name, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.name}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.val, flexShrink: 0, letterSpacing: '-0.01em' }}>
                    {formatMoney(card.amount)}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 10, color: '#C5C3C0', flex: 1 }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#F0EFEE', margin: '0 -1px' }} />

      {/* Amount display */}
      <div>
        <div style={{ fontSize: 9, color: '#9B9A98', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.04em', lineHeight: 1 }}>
          {amount}
        </div>
        <div style={{ fontSize: 10, color: '#9B9A98', fontWeight: 400, marginTop: 4 }}>
          {sublabel}
        </div>
      </div>
    </div>
  );
}

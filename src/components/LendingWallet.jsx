import React from "react";
import { formatMoney } from "@/components/utils/formatMoney";

/**
 * Stacked credit-card wallet.
 * cards:       [{ id, name, amount, purpose }]  — one per active loan
 * summaryCard: { label, amount, sublabel }       — shown at the back of the stack
 * onCardClick: (id) => void  — 'summary' | loan.id
 * selectedId:  string        — currently selected card id
 * isLending:   bool
 */
export default function LendingWallet({ cards, summaryCard, onCardClick, selectedId, isLending }) {
  const CARD_H  = 88;   // full card height px
  const PEEK    = 34;   // px of each back-card peeking below the one above
  const WIDTH   = 228;

  const accentColor = isLending ? '#03ACEA' : '#1D5B94';

  // All items: loan cards (front → back) then summary at very back
  const allCards = [
    ...cards.map(c => ({ ...c, isSummary: false })),
    { id: 'summary', isSummary: true, ...summaryCard },
  ];

  const N = allCards.length;
  const containerH = CARD_H + (N - 1) * PEEK;

  return (
    <div
      style={{
        position: 'relative',
        width: WIDTH,
        height: containerH,
        fontFamily: "'DM Sans', sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Render back-to-front so front card sits on top */}
      {[...allCards].reverse().map((card, revIdx) => {
        const origIdx  = N - 1 - revIdx; // 0 = frontmost loan card
        const topPx    = origIdx * PEEK;
        const zIdx     = revIdx;          // revIdx 0 = back (summary), N-1 = front
        const isActive = selectedId === card.id;

        const cardStyle = {
          position: 'absolute',
          top: topPx,
          left: 0,
          width: WIDTH,
          height: CARD_H,
          zIndex: zIdx,
          cursor: 'pointer',
          borderRadius: 14,
          overflow: 'hidden',
          border: isActive
            ? `1.5px solid ${accentColor}`
            : card.isSummary
              ? '1px solid rgba(0,0,0,0.10)'
              : '1px solid rgba(0,0,0,0.08)',
          background: card.isSummary ? '#F4F3F1' : '#ffffff',
          boxShadow: isActive
            ? `0 4px 20px ${accentColor}28, 0 2px 8px rgba(0,0,0,0.08)`
            : origIdx === 0
              ? '0 4px 14px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)'
              : '0 2px 8px rgba(0,0,0,0.07)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: 5,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxSizing: 'border-box',
        };

        return (
          <div
            key={card.id}
            style={cardStyle}
            onClick={() => onCardClick && onCardClick(card.id)}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = isActive
                ? `0 4px 20px ${accentColor}28, 0 2px 8px rgba(0,0,0,0.08)`
                : origIdx === 0
                  ? '0 4px 14px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)'
                  : '0 2px 8px rgba(0,0,0,0.07)';
            }}
          >
            {card.isSummary ? (
              /* ── Summary card ── */
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 4 }}>
                <div style={{
                  fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#9B9A98',
                }}>
                  {card.label || (isLending ? "You're owed" : 'You owe')}
                </div>
                <div style={{
                  fontSize: 24, fontWeight: 800, color: '#1A1918',
                  letterSpacing: '-0.04em', lineHeight: 1,
                }}>
                  {card.amount}
                </div>
                <div style={{ fontSize: 10, color: '#9B9A98', fontWeight: 400 }}>
                  {card.sublabel}
                </div>
              </div>
            ) : (
              /* ── Loan card ── */
              <>
                {/* Coloured left accent */}
                <div style={{
                  position: 'absolute',
                  left: 0, top: 10, bottom: 10,
                  width: 3,
                  borderRadius: '0 2px 2px 0',
                  background: accentColor,
                  opacity: isActive ? 1 : 0.5,
                }} />

                {/* Line 1: name ←→ amount */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                  paddingLeft: 10,
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#1A1918',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1,
                  }}>
                    {card.name}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 800, color: '#1A1918',
                    letterSpacing: '-0.02em', flexShrink: 0,
                  }}>
                    {formatMoney(card.amount)}
                  </span>
                </div>

                {/* Line 2: purpose */}
                <div style={{
                  fontSize: 11,
                  color: card.purpose ? '#9B9A98' : '#C5C3C0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  paddingLeft: 10,
                }}>
                  {card.purpose || 'No purpose specified'}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

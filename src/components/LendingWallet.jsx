import React from "react";
import { formatMoney } from "@/components/utils/formatMoney";

/**
 * Cream wallet body with a notched top edge that cards slot into.
 * Cards fan upward from the wallet pocket — each one peeks above the one in front.
 *
 * cards:        [{ id, name, amount, purpose }]
 * summaryCard:  { label, amount, sublabel }
 * onCardClick:  (id) => void
 * selectedId:   string
 * isLending:    bool
 */
export default function LendingWallet({ cards, summaryCard, onCardClick, selectedId, isLending }) {
  const WIDTH        = 280;
  const CARD_W       = 248;
  const CARD_H       = 78;
  const PEEK         = 14;                // how far each card behind peeks upward
  const WALLET_H     = 150;               // wallet body height
  const NOTCH_DEPTH  = 34;                // how deep the notch dips at the top middle
  const CARD_TUCK    = 30;                // how much of the front card is hidden inside the pocket

  const accentColor  = isLending ? '#03ACEA' : '#4B8EC8';
  const rainbowEdge  = 'linear-gradient(90deg, #FFB06B 0%, #E8726E 25%, #B088D4 55%, #7BAFE0 80%, #4B8EC8 100%)';

  const N            = Math.max(cards.length, 1);
  const stackHeight  = CARD_H + (N - 1) * PEEK;
  const containerH   = stackHeight + WALLET_H - CARD_TUCK;

  // Build SVG path for a rounded rectangle with a soft U-shaped notch in the middle of the top edge
  const R            = 22;                           // corner radius
  const notchStart   = WIDTH * 0.30;                 // x where left-side of notch begins
  const notchEnd     = WIDTH * 0.70;                 // x where right-side of notch ends
  const notchMid     = WIDTH * 0.50;
  const walletPath = `
    M ${R} 0
    L ${notchStart} 0
    C ${notchStart + 18} 0, ${notchMid - 36} ${NOTCH_DEPTH}, ${notchMid} ${NOTCH_DEPTH}
    C ${notchMid + 36} ${NOTCH_DEPTH}, ${notchEnd - 18} 0, ${notchEnd} 0
    L ${WIDTH - R} 0
    Q ${WIDTH} 0, ${WIDTH} ${R}
    L ${WIDTH} ${WALLET_H - R}
    Q ${WIDTH} ${WALLET_H}, ${WIDTH - R} ${WALLET_H}
    L ${R} ${WALLET_H}
    Q 0 ${WALLET_H}, 0 ${WALLET_H - R}
    L 0 ${R}
    Q 0 0, ${R} 0
    Z
  `;

  return (
    <div style={{ position: 'relative', width: WIDTH, height: containerH, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Card stack (rendered before wallet so wallet overlays the bottom) ── */}
      {cards.map((card, i) => {
        // i=0 is the front card (lowest, tucked deepest into pocket)
        // i=N-1 is the back card (highest, most peeked above)
        const topPx   = stackHeight - CARD_H - i * PEEK;
        const zIdx    = 10 + (N - i);     // front card highest z
        const isActive = selectedId === card.id;
        const isFront  = i === 0;

        return (
          <div
            key={card.id}
            onClick={() => onCardClick && onCardClick(card.id)}
            style={{
              position: 'absolute',
              top: topPx,
              left: (WIDTH - CARD_W) / 2,
              width: CARD_W,
              height: CARD_H,
              zIndex: zIdx,
              cursor: 'pointer',
              background: '#FFFFFF',
              borderRadius: 18,
              border: isActive ? `1.5px solid ${accentColor}` : '1px solid rgba(0,0,0,0.05)',
              boxShadow: isActive
                ? `0 6px 18px ${accentColor}40`
                : isFront
                  ? '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.05)'
                  : '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
              padding: '14px 18px 12px',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
              overflow: 'hidden',
            }}
          >
            {/* Rainbow top accent stripe */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: rainbowEdge,
              opacity: isFront ? 0.9 : 0.6,
            }} />

            {/* Line 1: name + amount */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 2 }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: '#1A1918',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1, letterSpacing: '-0.01em',
              }}>
                {card.name}
              </span>
              <span style={{
                fontSize: 14, fontWeight: 800, color: '#1A1918',
                letterSpacing: '-0.03em', flexShrink: 0,
              }}>
                {formatMoney(card.amount)}
              </span>
            </div>

            {/* Line 2: purpose/reason */}
            <div style={{
              fontSize: 11, marginTop: 5,
              color: card.purpose ? '#9B9A98' : '#C5C3C0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontWeight: 500,
            }}>
              {card.purpose || 'No reason specified'}
            </div>
          </div>
        );
      })}

      {/* ── Wallet body (cream, notched top) ── */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0,
        width: WIDTH, height: WALLET_H,
        zIndex: 100,
      }}>
        <svg
          width={WIDTH} height={WALLET_H}
          viewBox={`0 0 ${WIDTH} ${WALLET_H}`}
          style={{ position: 'absolute', inset: 0, display: 'block' }}
        >
          <defs>
            <linearGradient id="walletBodyBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#FEFDFB" />
              <stop offset="100%" stopColor="#F4F1EC" />
            </linearGradient>
            <filter id="walletShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.08" />
            </filter>
          </defs>
          <path
            d={walletPath}
            fill="url(#walletBodyBg)"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="1"
            filter="url(#walletShadow)"
          />
        </svg>

        {/* Content layer */}
        <div style={{
          position: 'absolute', inset: 0,
          padding: `${NOTCH_DEPTH + 18}px 20px 18px`,
          boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* Top row: card count pill */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '5px 11px', borderRadius: 999,
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
              fontSize: 11, fontWeight: 700, color: '#1A1918',
              letterSpacing: '-0.01em',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              {cards.length} card{cards.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Bottom row: label + amount on left, + button on right */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div
              onClick={() => onCardClick && onCardClick('summary')}
              style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
            >
              <div style={{
                fontSize: 11, color: '#9B9A98', fontWeight: 600,
                marginBottom: 3, letterSpacing: '-0.01em',
              }}>
                {summaryCard?.label || (isLending ? "You're owed" : 'You owe')}
                {summaryCard?.sublabel && (
                  <span style={{ color: accentColor, fontWeight: 700, marginLeft: 6 }}>
                    {summaryCard.sublabel}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800, color: '#1A1918',
                letterSpacing: '-0.04em', lineHeight: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {summaryCard?.amount || formatMoney(0)}
              </div>
            </div>

            {/* Circular + button */}
            <div
              onClick={() => onCardClick && onCardClick('summary')}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: accentColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
                boxShadow: `0 4px 12px ${accentColor}50, 0 1px 3px ${accentColor}40`,
                transition: 'transform 0.15s',
              }}
              aria-label="Summary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

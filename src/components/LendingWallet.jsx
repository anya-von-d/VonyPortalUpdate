import React from "react";
import { formatMoney } from "@/components/utils/formatMoney";

/**
 * Dark-navy wallet with stacked cards fanning from the top.
 *
 * Layout (top → bottom):
 *   - Summary card  (index 0, z=1)  — only top PEEK px visible
 *   - Loan card N   (index 1, z=2)  — only top PEEK px visible
 *   - …
 *   - Loan card 1   (index N, z=N+1) — front card, FULLY visible
 *   - Dark-navy wallet footer        — always visible, shows total
 *
 * cards:        [{ id, name, amount, purpose }]  — one per active loan
 * summaryCard:  { label, amount, sublabel }
 * onCardClick:  (id) => void  — 'summary' | loan.id
 * selectedId:   string
 * isLending:    bool
 */
export default function LendingWallet({ cards, summaryCard, onCardClick, selectedId, isLending }) {
  const CARD_H        = 82;   // total height of each card
  const PEEK          = 52;   // visible px at the TOP of each buried card (must fit 2 lines)
  const WIDTH         = 240;
  const WALLET_PAD_T  = 12;   // navy visible above first card
  const WALLET_FOOT_H = 52;   // navy footer below the front card

  const navyBg = '#0D1B2A';
  const accentColor = isLending ? '#03ACEA' : '#4B8EC8';
  const summaryGradient = isLending
    ? 'linear-gradient(135deg, #1A6B9A 0%, #0288D1 60%, #26C6DA 100%)'
    : 'linear-gradient(135deg, #1A237E 0%, #1D5B94 60%, #1565C0 100%)';

  // Summary card is buried deepest (index 0), front loan card is at the bottom (index N).
  // [...cards].reverse() so the first loan in the array ends up last (front).
  const stackItems = [
    { id: 'summary', isSummary: true, ...summaryCard },
    ...[...cards].reverse().map(c => ({ ...c, isSummary: false })),
  ];

  const N           = stackItems.length;
  // front card bottom-edge = WALLET_PAD_T + (N-1)*PEEK + CARD_H
  // container = that + WALLET_FOOT_H
  const containerH  = WALLET_PAD_T + (N - 1) * PEEK + CARD_H + WALLET_FOOT_H;

  return (
    <div
      style={{
        position: 'relative',
        width: WIDTH,
        height: containerH,
        fontFamily: "'DM Sans', sans-serif",
        flexShrink: 0,
        background: navyBg,
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {stackItems.map((card, i) => {
        const topPx   = WALLET_PAD_T + i * PEEK;
        const zIdx    = i + 1;          // summary=1 (lowest), front loan=N (highest)
        const isActive = selectedId === card.id;
        const isFront  = i === N - 1;  // front loan card = fully visible

        /* ── Summary card (gradient, buried at top) ── */
        if (card.isSummary) {
          return (
            <div
              key="summary"
              onClick={() => onCardClick && onCardClick('summary')}
              style={{
                position: 'absolute',
                top: topPx,
                left: 0,
                width: WIDTH,
                height: CARD_H,
                zIndex: zIdx,
                cursor: 'pointer',
                background: summaryGradient,
                borderRadius: 14,
                border: isActive
                  ? '1.5px solid rgba(255,255,255,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
                padding: '12px 16px 0',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Line 1: label + amount (visible in top PEEK area) */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: 'rgba(255,255,255,0.65)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {summaryCard.label || (isLending ? "You're owed" : 'You owe')}
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>
                  {summaryCard.amount}
                </span>
              </div>
              {/* Line 2: sublabel */}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                {summaryCard.sublabel}
              </div>
            </div>
          );
        }

        /* ── Loan card (white, stacked) ── */
        return (
          <div
            key={card.id}
            onClick={() => onCardClick && onCardClick(card.id)}
            style={{
              position: 'absolute',
              top: topPx,
              left: 0,
              width: WIDTH,
              height: CARD_H,
              zIndex: zIdx,
              cursor: 'pointer',
              background: '#FFFFFF',
              borderRadius: 14,
              border: isActive
                ? `1.5px solid ${accentColor}`
                : '1px solid rgba(255,255,255,0.05)',
              padding: '12px 16px 0',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxShadow: isActive
                ? `0 4px 16px ${accentColor}40`
                : isFront
                  ? '0 8px 24px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.14)'
                  : '0 2px 6px rgba(0,0,0,0.12)',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.22)'; }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = isActive
                ? `0 4px 16px ${accentColor}40`
                : isFront
                  ? '0 8px 24px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.14)'
                  : '0 2px 6px rgba(0,0,0,0.12)';
            }}
          >
            {/* Line 1: name + amount */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: '#1A1918',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1,
              }}>
                {card.name}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', flexShrink: 0 }}>
                {formatMoney(card.amount)}
              </span>
            </div>
            {/* Line 2: purpose */}
            <div style={{
              fontSize: 11, marginTop: 4,
              color: card.purpose ? '#9B9A98' : '#C5C3C0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {card.purpose || 'No purpose specified'}
            </div>
            {/* Accent bar (front card only, more prominent) */}
            {isFront && (
              <div style={{
                position: 'absolute',
                left: 0, top: 10, bottom: 10,
                width: 3,
                borderRadius: '0 2px 2px 0',
                background: accentColor,
                opacity: isActive ? 1 : 0.5,
              }} />
            )}
          </div>
        );
      })}

      {/* Dark-navy wallet footer — total, always visible */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: WALLET_FOOT_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        zIndex: 0,
      }}>
        <div>
          <div style={{
            fontSize: 9, fontWeight: 700,
            color: 'rgba(255,255,255,0.38)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 3,
          }}>
            {isLending ? "You're owed" : 'You owe'}
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {summaryCard.amount}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)' }}>
            {summaryCard.sublabel}
          </div>
        </div>
      </div>
    </div>
  );
}

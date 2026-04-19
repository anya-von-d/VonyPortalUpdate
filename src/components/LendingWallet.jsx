import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatMoney } from "@/components/utils/formatMoney";

/**
 * Wallet component for the Lending/Borrowing overview card.
 *
 * Shows up to 3 "cards" (one per person you've lent to / borrowed from)
 * fanned out of a wallet pocket. The pocket face shows a total ("You're owed $X")
 * and a subline ("$A of $B repaid to you"). An eye icon toggles redaction.
 *
 * On first mount, cards animate from tucked-in (inside pocket) to fanned-up.
 */
export default function LendingWallet({ cards, label, amount, sublabel, accentColor = '#03ACEA' }) {
  // Start tucked-in — flip to revealed shortly after mount for the opening animation.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setHidden(false), 350);
    return () => clearTimeout(t);
  }, []);

  // Fanned-up positions (back → front), relative to the card slot top.
  const REVEALED = [
    { y: -112, x: -8, rot: -4, z: 1 },
    { y:  -74, x:  6, rot:  3, z: 2 },
    { y:  -36, x: -2, rot: -1, z: 3 },
  ];
  // Tucked-in positions — PayPal-like behavior, cards reverse order when stored.
  const HIDDEN = [
    { y:  8, x: 0, rot: 0, z: 3 },
    { y:  4, x: 0, rot: 0, z: 2 },
    { y:  0, x: 0, rot: 0, z: 1 },
  ];

  // Three distinct, harmonious card palettes.
  const CARD_COLORS = [
    { bg: 'linear-gradient(135deg, #DDD6FE 0%, #C4B5FD 100%)', text: '#4C1D95', sub: '#6D28D9' },
    { bg: 'linear-gradient(135deg, #BBF7D0 0%, #86EFAC 100%)', text: '#14532D', sub: '#16A34A' },
    { bg: 'linear-gradient(135deg, #FFFFFF 0%, #F3F4F6 100%)', text: '#1F2937', sub: '#6B7280' },
  ];

  const WALLET_BG = '#2D5777';
  const WALLET_BG_DARK = '#234462';

  // Pad the cards array to 3 for consistent animation.
  const paddedCards = [...cards.slice(0, 3)];
  while (paddedCards.length < 3) paddedCards.push(null);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 280, margin: '0 auto', paddingTop: 120, paddingBottom: 0 }}>
      {/* Wallet back — tall rounded rectangle behind everything */}
      <div
        aria-hidden
        style={{
          position: 'absolute', left: 0, right: 0, top: 110, bottom: 0,
          background: `linear-gradient(180deg, ${WALLET_BG} 0%, ${WALLET_BG_DARK} 100%)`,
          borderRadius: 20,
          boxShadow: '0 14px 34px rgba(45,87,119,0.32), 0 2px 6px rgba(45,87,119,0.18)',
        }}
      />

      {/* Cards layer — positioned so fanned-up cards peek above the wallet top */}
      <div style={{ position: 'absolute', left: 18, right: 18, top: 140, height: 60, zIndex: 2 }}>
        {paddedCards.map((card, i) => {
          const t = hidden ? HIDDEN[i] : REVEALED[i];
          const palette = CARD_COLORS[i];
          return (
            <motion.div
              key={i}
              initial={{ y: HIDDEN[i].y, x: HIDDEN[i].x, rotate: HIDDEN[i].rot }}
              animate={{ y: t.y, x: t.x, rotate: t.rot, zIndex: t.z }}
              transition={{ type: 'spring', stiffness: 240, damping: 22, mass: 0.95, delay: hidden ? 0 : i * 0.06 }}
              style={{
                position: 'absolute', left: 0, right: 0, top: 0, height: 58,
                borderRadius: 10,
                background: palette.bg,
                padding: '0 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                fontFamily: "'DM Sans', sans-serif",
                opacity: card ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: palette.text, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                {card?.name || '—'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: palette.sub, letterSpacing: '-0.01em' }}>
                {hidden ? '• • • •' : (card ? formatMoney(card.amount) : '')}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Wallet front (pocket face) — covers the lower half of the cards */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          marginTop: 60,
          height: 160,
          background: `linear-gradient(180deg, ${WALLET_BG} 0%, ${WALLET_BG_DARK} 100%)`,
          borderRadius: 20,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.18), 0 2px 6px rgba(45,87,119,0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '18px 20px 14px',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={hidden ? 'hidden' : 'shown'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{ textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 3 }}>
              {hidden ? '* * * * *' : label}
            </div>
            <div style={{ fontSize: 26, color: '#ffffff', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {hidden ? '* * *' : amount}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 400, marginTop: 6 }}>
              {hidden ? '* * * * * * *' : sublabel}
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setHidden(h => !h)}
          aria-label={hidden ? 'Show balance' : 'Hide balance'}
          style={{
            marginTop: 10, background: 'rgba(255,255,255,0.08)', border: 'none',
            width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
            color: 'rgba(255,255,255,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
            <motion.line
              x1="3" y1="3" x2="21" y2="21"
              initial={false}
              animate={{ pathLength: hidden ? 1 : 0, opacity: hidden ? 1 : 0 }}
              transition={{ duration: 0.25 }}
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

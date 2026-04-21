import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * BlockConfirmModal — confirmation dialog for blocking a user.
 *
 * Props:
 *   open      {boolean}
 *   name      {string}  — display name of the user being blocked
 *   onBack    {() => void}
 *   onConfirm {() => void}
 *   isWorking {boolean} — disables confirm while processing
 */
export default function BlockConfirmModal({ open, name, onBack, onConfirm, isWorking = false }) {
  if (!open) return null;

  return createPortal(
    <div
      onClick={onBack}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16, maxWidth: 400, width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
          padding: '24px 24px 20px', position: 'relative',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Close"
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.05)',
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#787776',
          }}
        >
          <X size={14} strokeWidth={2.5} />
        </button>

        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em', marginBottom: 10 }}>
          Block {name || 'this person'}?
        </div>
        <div style={{ fontSize: 12, color: '#787776', lineHeight: 1.55, marginBottom: 18 }}>
          {name || 'This person'} <strong>will not</strong> be notified. You&apos;ll both be removed from each other&apos;s friends list,
          and neither of you will see the other when searching in Find Friends.
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onBack}
            disabled={isWorking}
            style={{
              padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.10)',
              background: 'white', fontSize: 12, fontWeight: 600, color: '#1A1918',
              cursor: isWorking ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
              opacity: isWorking ? 0.6 : 1,
            }}
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isWorking}
            style={{
              padding: '8px 16px', borderRadius: 9, border: 'none',
              background: '#E8726E', fontSize: 12, fontWeight: 600, color: 'white',
              cursor: isWorking ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
              opacity: isWorking ? 0.6 : 1,
            }}
          >
            {isWorking ? 'Blocking…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

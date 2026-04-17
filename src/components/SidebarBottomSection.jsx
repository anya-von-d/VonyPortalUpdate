import React, { useState, useEffect } from 'react';
import SettingsModal from './SettingsModal';
import { Loan, User, PublicProfile } from '@/entities/all';
import { daysUntil as daysUntilDate } from '@/components/utils/dateUtils';

// Module-level cache so notifications persist across sidebar remounts
// (each page swap creates a new DesktopSidebar → new SidebarBottomSection).
// Without this, the "What Needs Attention" list briefly empties and grows
// back in, which shifts the whole sidebar layout on every page nav.
let cachedNotifications = null;
let cachedLoaded = false;

export default function SidebarBottomSection() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState(cachedNotifications || []);
  const [loaded, setLoaded] = useState(cachedLoaded);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const currentUser = await User.me();
      const [loans, profiles] = await Promise.all([
        Loan.list('-created_at').catch(() => []),
        PublicProfile.list().catch(() => []),
      ]);

      const userLoans = (loans || []).filter(
        l => l.lender_id === currentUser.id || l.borrower_id === currentUser.id
      );

      const borrowingActive = userLoans.filter(
        l => l.borrower_id === currentUser.id && l.status === 'active'
      );
      const lendingActive = userLoans.filter(
        l => l.lender_id === currentUser.id && l.status === 'active'
      );
      const pendingOffers = userLoans.filter(
        l => l.borrower_id === currentUser.id && l.status === 'pending'
      );

      const notifs = [];

      // 1. Overdue borrowing payments (payments the user owes and hasn't sent)
      const overdueOwed = borrowingActive.filter(
        l => l.next_payment_date && daysUntilDate(l.next_payment_date) < 0
      );
      if (overdueOwed.length === 1) {
        notifs.push({ key: 'overdue_owed_1', text: 'You have an overdue payment', priority: 10, type: 'overdue' });
      } else if (overdueOwed.length > 1) {
        notifs.push({ key: 'overdue_owed_n', text: `You have ${overdueOwed.length} overdue payments`, priority: 10, type: 'overdue' });
      }

      // 2. Lender-side overdue: borrower hasn't paid you
      const overdueIncoming = lendingActive.filter(
        l => l.next_payment_date && daysUntilDate(l.next_payment_date) < 0
      );
      overdueIncoming.forEach(loan => {
        const profile = (profiles || []).find(p => p.user_id === loan.borrower_id);
        const firstName = profile?.full_name?.split(' ')[0] || profile?.username || 'Someone';
        notifs.push({
          key: `overdue_incoming_${loan.id}`,
          text: `${firstName}'s payment to you is overdue`,
          priority: 9,
          type: 'overdue_incoming',
        });
      });

      // 3. Soonest upcoming borrowing payment
      const upcomingSorted = borrowingActive
        .filter(l => l.next_payment_date && daysUntilDate(l.next_payment_date) >= 0)
        .map(l => ({ ...l, days: daysUntilDate(l.next_payment_date) }))
        .sort((a, b) => a.days - b.days);
      if (upcomingSorted.length > 0) {
        const s = upcomingSorted[0];
        const dText = s.days === 0 ? 'today' : `in ${s.days} day${s.days === 1 ? '' : 's'}`;
        notifs.push({ key: 'upcoming_due', text: `You have a payment due ${dText}`, priority: 8, type: 'due' });
      }

      // 4. Pending loan offers received
      pendingOffers.slice(0, 2).forEach(loan => {
        const profile = (profiles || []).find(p => p.user_id === loan.lender_id);
        const firstName = profile?.full_name?.split(' ')[0] || profile?.username || 'Someone';
        notifs.push({
          key: `offer_${loan.id}`,
          text: `${firstName} sent you a loan offer`,
          priority: 7,
          type: 'offer',
        });
      });

      notifs.sort((a, b) => b.priority - a.priority);
      const top = notifs.slice(0, 3);
      cachedNotifications = top;
      cachedLoaded = true;
      setNotifications(top);
      setLoaded(true);
    } catch {
      cachedLoaded = true;
      setLoaded(true);
    }
  };

  const NotifIcon = ({ type }) => {
    // Only overdue (payments you owe) stays red — everything else is blue
    const color = type === 'overdue' ? '#E8726E' : '#03ACEA';
    if (type === 'overdue') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      );
    }
    if (type === 'overdue_incoming') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      );
    }
    if (type === 'due') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      );
    }
    if (type === 'offer') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
        </svg>
      );
    }
    return null;
  };

  return (
    <>
      {/* ── Key Alerts section ──
          Reserved min-height keeps the sidebar layout (esp. the vertically
          centered Document Center group above) from shifting as notifications
          load or change count. Fits header + up to 3 notification rows. */}
      <div style={{ minHeight: 120 }}>
        <div style={{ paddingLeft: 12, marginBottom: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: '#03ACEA',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            What Needs Attention
          </span>
        </div>

        {!loaded ? null : notifications.length === 0 ? (
          <div style={{ paddingLeft: 12, paddingRight: 8 }}>
            <p style={{
              fontSize: 12, color: '#C5C3C0',
              fontFamily: "'DM Sans', sans-serif",
              margin: 0, lineHeight: 1.45,
            }}>
              All clear — nothing needs attention right now 🎉
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {notifications.map(notif => (
              <div key={notif.key} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '5px 12px', borderRadius: 8,
              }}>
                <NotifIcon type={notif.type} />
                <span style={{
                  fontSize: 11, fontWeight: 500, color: '#787776',
                  fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1.4,
                }}>
                  {notif.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Settings — always at the bottom ── */}
      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
            borderRadius: 9, border: 'none', cursor: 'pointer', background: 'transparent',
            fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#9B9A98',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#787776' }}>Settings</span>
        </button>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

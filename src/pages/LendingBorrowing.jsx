import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile, LoanAgreement, User } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import UserAvatar from "@/components/ui/UserAvatar";

// ─── Loan row card ────────────────────────────────────────────────────────────
function LoanRow({ loan, otherName, otherPic, isLender, navigate }) {
  const days = loan.next_payment_date ? daysUntilDate(loan.next_payment_date) : null;
  const isOverdue = days !== null && days < 0;
  const isUpcoming = days !== null && days >= 0 && days <= 5;
  const statusColor = isOverdue ? '#E8726E' : isUpcoming ? '#D97706' : '#03ACEA';
  const statusBg   = isOverdue ? 'rgba(232,114,110,0.10)' : isUpcoming ? 'rgba(217,119,6,0.08)' : 'rgba(3,172,234,0.08)';
  const statusText = loan.status === 'active'
    ? isOverdue ? `${Math.abs(days)}d overdue`
    : days === 0 ? 'Due today'
    : days !== null ? `${days}d left`
    : 'Active'
    : loan.status === 'completed' ? 'Completed'
    : loan.status === 'pending' ? 'Pending'
    : loan.status;

  const progress = loan.total_amount > 0
    ? Math.min(100, Math.round(((loan.amount_paid || 0) / loan.total_amount) * 100))
    : 0;

  return (
    <button
      onClick={() => navigate(createPageUrl('YourLoans') + `?tab=${isLender ? 'lending' : 'borrowing'}`)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', padding: '14px 0',
        background: 'transparent', border: 'none', cursor: 'pointer',
        textAlign: 'left', fontFamily: "'DM Sans', sans-serif",
        borderBottom: '1px solid #F0EFEE',
      }}
    >
      {/* Avatar */}
      <UserAvatar name={otherName} src={otherPic} size={42} radius={21} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {otherName}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', flexShrink: 0, marginLeft: 8 }}>
            {formatMoney(loan.amount || 0)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* Progress bar */}
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#F0EFEE', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${progress}%`, background: isLender ? '#03ACEA' : '#6366F1', transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: statusBg, borderRadius: 5, padding: '2px 6px', flexShrink: 0, letterSpacing: '0.01em' }}>
            {statusText}
          </span>
        </div>
        {loan.next_payment_date && loan.status === 'active' && (
          <div style={{ fontSize: 10, color: '#9B9A98', marginTop: 3, letterSpacing: '-0.01em' }}>
            Next: {format(new Date(loan.next_payment_date), 'MMM d')} · {formatMoney(loan.payment_amount || 0)}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LendingBorrowing() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'lending';
  const setTab = (t) => setSearchParams({ tab: t });

  const [user, setUser]               = useState(null);
  const [allLoans, setAllLoans]       = useState([]);
  const [profiles, setProfiles]       = useState([]);
  const [isLoading, setIsLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const u = await User.me();
        setUser(u);
        const [loans, profs] = await Promise.all([
          Loan.list('-created_at').catch(() => []),
          PublicProfile.list().catch(() => []),
        ]);
        setAllLoans((loans || []).filter(l => l.lender_id === u.id || l.borrower_id === u.id));
        setProfiles(profs || []);
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    })();
  }, []);

  const lendingLoans   = allLoans.filter(l => l.lender_id === user?.id);
  const borrowingLoans = allLoans.filter(l => l.borrower_id === user?.id);

  const displayLoans = activeTab === 'lending' ? lendingLoans : borrowingLoans;

  const getProfile = (uid) => profiles.find(p => p.user_id === uid);

  // ── Button style helpers ────────────────────────────────────────────────────
  const pillBase = {
    height: 52, borderRadius: 40, fontSize: 15, fontWeight: 700,
    cursor: 'pointer', border: 'none', fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '-0.01em', transition: 'opacity 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    paddingLeft: 28, paddingRight: 28,
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#FAFAF8', color: '#1A1918' }}>
      <MeshMobileNav user={user} activePage="LendingBorrowing" />

      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '176px 1fr', gap: 0 }}>
        <DesktopSidebar />

        <div className="mesh-center" style={{ padding: '40px 32px 80px', maxWidth: 720, margin: '0 auto', width: '100%' }}>

          {/* ── Title ── */}
          <h1 style={{
            textAlign: 'center', fontSize: 26, fontWeight: 800,
            color: '#1A1918', letterSpacing: '-0.04em', lineHeight: 1.1,
            marginBottom: 28, fontFamily: "'DM Sans', sans-serif",
          }}>
            Lending &amp; Borrowing
          </h1>

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 36 }}>
            {/* Create Loan — light pill */}
            <button
              onClick={() => navigate(createPageUrl('CreateOffer'))}
              style={{
                ...pillBase,
                flex: 1, maxWidth: 220,
                background: '#ffffff',
                color: '#1A1918',
                border: '2px solid #1A1918',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              Create Loan
            </button>

            {/* Log Payment — dark pill */}
            <button
              onClick={() => navigate(createPageUrl('RecordPayment'))}
              style={{
                ...pillBase,
                flex: 1, maxWidth: 220,
                background: '#1A1918',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              }}
            >
              Log Payment
            </button>
          </div>

          {/* ── Tab nav ── */}
          <div style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { key: 'lending',   label: 'Lending',   count: lendingLoans.length },
                { key: 'borrowing', label: 'Borrowing', count: borrowingLoans.length },
              ].map(({ key, label, count }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    style={{
                      position: 'relative',
                      flex: 1,
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '12px 0 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <span style={{
                      fontSize: 16, fontWeight: active ? 700 : 500,
                      color: active ? '#1A1918' : '#9B9A98',
                      letterSpacing: '-0.02em',
                      transition: 'color 0.15s, font-weight 0.15s',
                    }}>
                      {label}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 20, height: 20, borderRadius: 10,
                      background: active ? '#1A1918' : '#E8E7E5',
                      color: active ? '#ffffff' : '#787776',
                      fontSize: 11, fontWeight: 700,
                      padding: '0 5px',
                      transition: 'background 0.15s, color 0.15s',
                    }}>
                      {count}
                    </span>
                    {/* Active underline */}
                    {active && (
                      <motion.div
                        layoutId="tab-underline"
                        style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          height: 3, borderRadius: 2, background: '#1A1918',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Full-width separator */}
            <div style={{ height: 1, background: '#E8E7E5' }} />
          </div>

          {/* ── Tab content ── */}
          <div style={{ marginTop: 8 }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E8E7E5', borderTopColor: '#1A1918', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : displayLoans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 0', color: '#9B9A98' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{activeTab === 'lending' ? '🌱' : '🤝'}</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {activeTab === 'lending' ? "You haven't lent anything yet" : "You haven't borrowed anything yet"}
                </div>
                <button
                  onClick={() => navigate(createPageUrl('CreateOffer'))}
                  style={{
                    marginTop: 20, padding: '10px 24px', borderRadius: 20,
                    background: '#1A1918', color: '#fff',
                    fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Create a loan
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {displayLoans.map((loan) => {
                    const isLender = loan.lender_id === user?.id;
                    const otherId  = isLender ? loan.borrower_id : loan.lender_id;
                    const prof     = getProfile(otherId);
                    const name     = prof?.full_name?.split(' ')[0] || prof?.username || 'User';
                    return (
                      <LoanRow
                        key={loan.id}
                        loan={loan}
                        otherName={name}
                        otherPic={prof?.profile_picture_url || null}
                        isLender={isLender}
                        navigate={navigate}
                      />
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

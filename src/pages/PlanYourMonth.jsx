import React, { useState, useEffect } from "react";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useDemoMode } from "@/lib/DemoModeContext";
import { getDemoPlanItems } from "@/lib/demoData";
import {
  format, startOfMonth, endOfMonth, addMonths,
} from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate } from "@/components/utils/dateUtils";
import { todayInTZ, currentDateStringTZ } from "@/components/utils/timezone";
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from '../components/DesktopSidebar';

export default function PlanYourMonth() {
  const { user: authUser, userProfile, isLoadingAuth, navigateToLogin } = useAuth();
  const { isDemoMode } = useDemoMode();

  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [customExpenses, setCustomExpenses] = useState(() => {
    try { const raw = localStorage.getItem('vony.plan-expenses'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [addingExpense, setAddingExpense] = useState(false);
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState('');
  const [newExpenseDir, setNewExpenseDir] = useState('out');
  const [editingPlan, setEditingPlan] = useState(false);
  const [planTickTarget, setPlanTickTarget] = useState(null);
  const [planTickAmount, setPlanTickAmount] = useState('');
  const [planTickWorking, setPlanTickWorking] = useState(false);

  const user = userProfile ? { ...userProfile, id: authUser?.id, email: authUser?.email } : null;

  const addCustomExpense = (label, amount, date, dir) => {
    if (!label.trim() || !amount) return;
    const signed = dir === 'in' ? Math.abs(parseFloat(amount)) : -Math.abs(parseFloat(amount));
    const exp = { id: `exp-${Date.now()}`, label: label.trim(), amount: signed, date: date || null, status: 'custom' };
    setCustomExpenses(prev => { const next = [...prev, exp]; try { localStorage.setItem('vony.plan-expenses', JSON.stringify(next)); } catch {} return next; });
  };
  const deleteCustomExpense = (id) => {
    setCustomExpenses(prev => { const next = prev.filter(e => e.id !== id); try { localStorage.setItem('vony.plan-expenses', JSON.stringify(next)); } catch {} return next; });
  };
  const toggleCustomExpenseDone = (id) => {
    setCustomExpenses(prev => { const next = prev.map(e => e.id === id ? { ...e, done: !e.done } : e); try { localStorage.setItem('vony.plan-expenses', JSON.stringify(next)); } catch {} return next; });
  };

  const safeEntityCall = async (entityCall, fallback = []) => {
    try {
      const result = await entityCall();
      return Array.isArray(result) ? result : (result ? [result] : fallback);
    } catch { return fallback; }
  };

  const loadData = async () => {
    if (!authUser) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [allLoans, allPayments, allProfiles] = await Promise.all([
        safeEntityCall(() => Loan.list('-created_at')),
        safeEntityCall(() => Payment.list('-created_at', 500)),
        safeEntityCall(() => PublicProfile.list()),
      ]);
      setLoans(allLoans);
      setPayments(allPayments);
      setPublicProfiles(allProfiles);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handlePlanTickConfirm = async () => {
    if (!planTickTarget || planTickWorking) return;
    const amount = parseFloat(planTickAmount);
    if (!amount || amount <= 0 || Number.isNaN(amount)) return;
    setPlanTickWorking(true);
    try {
      const { loan } = planTickTarget;
      await Payment.create({ loan_id: loan.id, amount, status: 'completed', payment_date: currentDateStringTZ() });
      const newPaid = (loan.amount_paid || 0) + amount;
      const total = loan.total_amount || loan.amount || 0;
      const remaining = total - newPaid;
      const loanUpdate = { amount_paid: newPaid };
      if (remaining <= 0) { loanUpdate.status = 'completed'; loanUpdate.next_payment_date = null; }
      else { loanUpdate.next_payment_date = format(addMonths(todayInTZ(), 1), 'yyyy-MM-dd'); }
      await Loan.update(loan.id, loanUpdate);
      setPlanTickTarget(null);
      setPlanTickAmount('');
      await loadData();
    } catch (e) { console.error('Error confirming plan tick payment:', e); }
    setPlanTickWorking(false);
  };

  useEffect(() => {
    if (!isLoadingAuth && authUser) loadData();
    else if (!isLoadingAuth && !authUser) setIsLoading(false);
  }, [isLoadingAuth]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #54A6CF', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 12, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1A1918', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Sign in to plan your month</h1>
          <button onClick={navigateToLogin} style={{ width: '100%', padding: '12px 24px', fontSize: 15, fontWeight: 600, background: '#54A6CF', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign In</button>
        </div>
      </div>
    );
  }

  // ── Data ──
  const today = todayInTZ();
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeProfiles = Array.isArray(publicProfiles) ? publicProfiles : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const myLoans = safeLoans.filter(l => l && (l.lender_id === user.id || l.borrower_id === user.id));
  const lentLoans = myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active');
  const borrowedLoans = myLoans.filter(l => l && l.borrower_id === user.id && l.status === 'active');

  // ── Plan tab logic ──
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthName = format(today, 'MMMM');

  const cashLines = [];
  safePayments.forEach(p => {
    if (!p || p.status !== 'completed') return;
    const d = p.payment_date ? toLocalDate(p.payment_date) : new Date(p.created_at);
    if (d < monthStart || d > monthEnd) return;
    const loan = myLoans.find(l => l.id === p.loan_id);
    if (!loan) return;
    const isLender = loan.lender_id === user.id;
    const otherId = isLender ? loan.borrower_id : loan.lender_id;
    const prof = safeProfiles.find(pp => pp.user_id === otherId);
    const name = prof?.full_name?.split(' ')[0] || prof?.username || (isLender ? 'Borrower' : 'Lender');
    const paidDateStr = format(d, 'MMM d');
    cashLines.push({ id: `paid-${p.id}`, label: isLender ? `Received from ${name} · ${paidDateStr}` : `Sent to ${name} · ${paidDateStr}`, amount: isLender ? (p.amount || 0) : -(p.amount || 0), date: d, status: 'done', reason: loan.reason || loan.purpose || '' });
  });

  const completedThisMonth = new Set(safePayments.filter(p => {
    if (!p || p.status !== 'completed') return false;
    const d = p.payment_date ? toLocalDate(p.payment_date) : new Date(p.created_at);
    return d >= monthStart && d <= monthEnd;
  }).map(p => p.loan_id));

  lentLoans.forEach(loan => {
    if (!loan.next_payment_date) return;
    const d = toLocalDate(loan.next_payment_date);
    if (d < monthStart || d > monthEnd) return;
    if (completedThisMonth.has(loan.id)) return;
    const p = safeProfiles.find(pp => pp.user_id === loan.borrower_id);
    const name = p?.full_name?.split(' ')[0] || p?.username || 'Borrower';
    cashLines.push({ id: `sched-in-${loan.id}`, label: `Due from ${name} · ${format(d, 'MMM d')}`, amount: loan.payment_amount || 0, date: d, status: 'scheduled', dateLabel: 'expect by', reason: loan.reason || loan.purpose || '' });
  });
  borrowedLoans.forEach(loan => {
    if (!loan.next_payment_date) return;
    const d = toLocalDate(loan.next_payment_date);
    if (d < monthStart || d > monthEnd) return;
    if (completedThisMonth.has(loan.id)) return;
    const p = safeProfiles.find(pp => pp.user_id === loan.lender_id);
    const name = p?.full_name?.split(' ')[0] || p?.username || 'Lender';
    cashLines.push({ id: `sched-out-${loan.id}`, label: `Due to ${name} · ${format(d, 'MMM d')}`, amount: -(loan.payment_amount || 0), date: d, status: 'scheduled', dateLabel: 'due', reason: loan.reason || loan.purpose || '' });
  });
  lentLoans.forEach(loan => {
    if (!loan.next_payment_date) return;
    const d = toLocalDate(loan.next_payment_date);
    if (d >= monthStart) return;
    if (completedThisMonth.has(loan.id)) return;
    const p = safeProfiles.find(pp => pp.user_id === loan.borrower_id);
    const name = p?.full_name?.split(' ')[0] || p?.username || 'Borrower';
    cashLines.push({ id: `overdue-in-${loan.id}`, label: `Overdue from ${name} since ${format(d, 'MMM d')}`, amount: loan.payment_amount || 0, date: today, overdueDate: d, status: 'overdue', dateLabel: 'expect by', reason: loan.reason || loan.purpose || '' });
  });
  borrowedLoans.forEach(loan => {
    if (!loan.next_payment_date) return;
    const d = toLocalDate(loan.next_payment_date);
    if (d >= monthStart) return;
    if (completedThisMonth.has(loan.id)) return;
    const p = safeProfiles.find(pp => pp.user_id === loan.lender_id);
    const name = p?.full_name?.split(' ')[0] || p?.username || 'Lender';
    cashLines.push({ id: `overdue-out-${loan.id}`, label: `Overdue to ${name} since ${format(d, 'MMM d')}`, amount: -(loan.payment_amount || 0), date: today, overdueDate: d, status: 'overdue', dateLabel: 'due', reason: loan.reason || loan.purpose || '' });
  });

  cashLines.sort((a, b) => (a.date || new Date(0)) - (b.date || new Date(0)));
  const effectiveCashLines = isDemoMode
    ? cashLines.filter(line => !line.id.includes('demo-loan-7') && !line.id.includes('demo-pay-7'))
    : cashLines;
  const rawCustomExpenses = isDemoMode ? getDemoPlanItems() : customExpenses;
  const customLines = rawCustomExpenses.map(e => ({
    ...e, date: e.date ? toLocalDate(e.date) : null,
    status: e.done ? 'done' : (e.status || 'custom'),
    dateLabel: e.amount >= 0 ? 'expect by' : 'due',
  }));
  const allLines = [...effectiveCashLines, ...customLines];
  const total = allLines.reduce((s, l) => s + l.amount, 0);
  const soFarTotal = allLines.filter(l => l.status === 'done').reduce((s, l) => s + l.amount, 0);
  const fmtSigned = (amt) => amt === 0 ? '$0.00' : amt > 0 ? `+${formatMoney(amt)}` : `-${formatMoney(Math.abs(amt))}`;

  const firstCustomIdx = isDemoMode
    ? (rawCustomExpenses.length > 0 ? effectiveCashLines.length : -1)
    : allLines.findIndex(line => customExpenses.some(e => e.id === line.id));

  const loanIncomeLines    = allLines.filter(l => !customExpenses.some(e => e.id === l.id) && l.amount > 0);
  const customIncomeLines  = allLines.filter(l => customExpenses.some(e => e.id === l.id) && l.amount > 0);
  const loanExpenseLines   = allLines.filter(l => !customExpenses.some(e => e.id === l.id) && l.amount < 0);
  const customExpenseLines = allLines.filter(l => customExpenses.some(e => e.id === l.id) && l.amount < 0);
  const loanIncomeTotal    = loanIncomeLines.reduce((s, l) => s + l.amount, 0);
  const customIncomeTotal  = customIncomeLines.reduce((s, l) => s + l.amount, 0);
  const loanExpenseTotal   = Math.abs(loanExpenseLines.reduce((s, l) => s + l.amount, 0));
  const customExpenseTotal = Math.abs(customExpenseLines.reduce((s, l) => s + l.amount, 0));
  const totalIncome    = loanIncomeTotal + customIncomeTotal;
  const totalExpenses  = loanExpenseTotal + customExpenseTotal;
  const netTotal       = totalIncome - totalExpenses;

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>
      <MeshMobileNav user={user} activePage="PlanYourMonth" />
      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>
        <DesktopSidebar />

        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 56px 80px' }}>

          {/* Desktop page title */}
          <div className="desktop-page-title" style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, color: '#1A1918' }}>
              Plan Your Month
            </div>
          </div>

          {/* Mobile-only page title */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Plan Your Month</div>
          </div>

          <style>{`
            @media (max-width: 768px) {
              .plan-month-layout { flex-direction: column !important; }
              .plan-summary-box { order: -1; }
            }
          `}</style>

          <div className="plan-month-layout" style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>

            {/* ── Left: cashflow list ── */}
            <div style={{ maxWidth: 520, flex: '0 0 auto' }}>
              <div style={{ background: '#FEFEFE', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.10)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>{monthName}</span>
                  <button type="button" onClick={() => setEditingPlan(v => !v)}
                    style={{ fontSize: 10, fontWeight: 600, color: editingPlan ? '#E8726E' : '#9B9A98', fontFamily: "'DM Sans', sans-serif", background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', letterSpacing: 0.2 }}>
                    {editingPlan ? 'Done' : 'Edit'}
                  </button>
                </div>

                {allLines.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9B9A98', textAlign: 'center', padding: '8px 0' }}>No cashflow scheduled 🌿</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {allLines.map((line, idx) => {
                      const isPos      = line.amount >= 0;
                      const isDone     = line.status === 'done';
                      const isOverdue  = line.status === 'overdue';
                      const isCustom   = customExpenses.some(e => e.id === line.id);
                      const isFirstCustom = firstCustomIdx !== -1 && idx === firstCustomIdx;
                      const dotColor   = isDone ? '#03ACEA' : isOverdue ? '#E8726E' : isPos ? '#03ACEA' : '#1D5B94';
                      const isLoanCashLine = line.id.startsWith('paid-') || line.id.startsWith('sched-') || line.id.startsWith('overdue-');
                      const subLabel   = isLoanCashLine
                        ? (line.reason || null)
                        : (line.date ? `${line.dateLabel || ''} ${format(line.date, 'MMM d')}`.trim() : null);
                      const loanLineMatch = line.id.match(/^(sched-in|sched-out|overdue-in|overdue-out)-(.+)$/);
                      const isLoanLine    = !!loanLineMatch;
                      const loanForLine   = isLoanLine ? myLoans.find(l => l.id === loanLineMatch[2]) : null;
                      const isTickableLoan = !!loanForLine && !isDemoMode;
                      const isTickPromptOpen = planTickTarget?.lineId === line.id;

                      return (
                        <React.Fragment key={line.id}>
                          {isFirstCustom && (
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif", paddingBottom: 4, paddingTop: 6 }}>
                              Additional Income and Expenses
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                            <div
                              onClick={
                                isCustom ? () => toggleCustomExpenseDone(line.id)
                                : isTickableLoan ? () => { const scheduled = Math.abs(line.amount); setPlanTickTarget({ lineId: line.id, loan: loanForLine, scheduled, direction: line.amount >= 0 ? 'in' : 'out' }); setPlanTickAmount(String(scheduled)); }
                                : undefined
                              }
                              style={{ flexShrink: 0, width: 13, height: 13, borderRadius: '50%', background: isDone ? '#03ACEA' : `${dotColor}18`, border: `1.5px solid ${dotColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (isCustom || isTickableLoan) ? 'pointer' : 'default', alignSelf: 'center' }}>
                              {isDone ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : null}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: isDone ? '#B0AEA8' : '#1A1918', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.label}</span>
                              {subLabel && <span style={{ fontSize: 10, color: isOverdue ? '#E8726E' : '#B0AEA8', fontFamily: "'DM Sans', sans-serif" }}>{subLabel}</span>}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isPos ? '#03ACEA' : '#1D5B94', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, alignSelf: 'center' }}>{fmtSigned(line.amount)}</span>
                            {editingPlan && isCustom && (
                              <button type="button" onClick={() => deleteCustomExpense(line.id)}
                                style={{ flexShrink: 0, width: 16, height: 16, borderRadius: '50%', background: '#FEE2E1', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginLeft: 2 }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#E8726E" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            )}
                          </div>
                          {isTickPromptOpen && (
                            <form onSubmit={(e) => { e.preventDefault(); handlePlanTickConfirm(); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 8px 21px' }}>
                              <span style={{ fontSize: 10, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Amount {planTickTarget.direction === 'in' ? 'received' : 'sent'}</span>
                              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1.5px solid #03ACEA', paddingBottom: 1 }}>
                                <span style={{ fontSize: 11, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>$</span>
                                <input autoFocus type="number" min="0" step="0.01" value={planTickAmount} onChange={(e) => setPlanTickAmount(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Escape') { setPlanTickTarget(null); setPlanTickAmount(''); } }}
                                  style={{ width: 64, fontSize: 11, fontFamily: "'DM Sans', sans-serif", border: 'none', outline: 'none', background: 'transparent', color: '#1A1918', padding: '2px 0', textAlign: 'right' }} />
                              </div>
                              <button type="submit" disabled={planTickWorking}
                                style={{ background: '#03ACEA', border: 'none', cursor: planTickWorking ? 'default' : 'pointer', borderRadius: 6, padding: '3px 10px', color: '#fff', fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", opacity: planTickWorking ? 0.6 : 1 }}>
                                {planTickWorking ? '…' : 'Confirm'}
                              </button>
                              <button type="button" onClick={() => { setPlanTickTarget(null); setPlanTickAmount(''); }}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9B9A98', fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", padding: '3px 4px' }}>
                                Cancel
                              </button>
                            </form>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {/* Totals */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.13)', marginBottom: 4 }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>So Far This Month</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: soFarTotal >= 0 ? '#03ACEA' : '#1D5B94', fontFamily: "'DM Sans', sans-serif" }}>{fmtSigned(soFarTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 2px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>Net {monthName}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: total >= 0 ? '#03ACEA' : '#1D5B94', fontFamily: "'DM Sans', sans-serif" }}>{fmtSigned(total)}</span>
                  </div>
                </div>

                {/* Add expense form */}
                {addingExpense && (
                  <form onSubmit={e => { e.preventDefault(); addCustomExpense(newExpenseLabel, newExpenseAmount, newExpenseDate, newExpenseDir); setNewExpenseLabel(''); setNewExpenseAmount(''); setNewExpenseDate(''); setNewExpenseDir('out'); setAddingExpense(false); }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['in','out'].map(d => (
                        <button key={d} type="button" onClick={() => setNewExpenseDir(d)}
                          style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1.5px solid ${newExpenseDir === d ? '#03ACEA' : '#D9D8D6'}`, background: newExpenseDir === d ? '#EBF4FA' : 'transparent', color: newExpenseDir === d ? '#03ACEA' : '#9B9A98', fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}>
                          {d === 'in' ? '+ Money in' : '− Money out'}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input autoFocus value={newExpenseLabel} onChange={e => setNewExpenseLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setAddingExpense(false); }} placeholder="Label…"
                        style={{ flex: 1, fontSize: 12, fontFamily: "'DM Sans', sans-serif", border: 'none', borderBottom: '1.5px solid #03ACEA', outline: 'none', background: 'transparent', color: '#1A1918', padding: '2px 0' }} />
                      <input value={newExpenseAmount} onChange={e => setNewExpenseAmount(e.target.value)} placeholder="$0" type="number" min="0" step="0.01"
                        style={{ width: 56, fontSize: 12, fontFamily: "'DM Sans', sans-serif", border: 'none', borderBottom: '1.5px solid #03ACEA', outline: 'none', background: 'transparent', color: '#1A1918', padding: '2px 0', textAlign: 'right' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input value={newExpenseDate} onChange={e => setNewExpenseDate(e.target.value)} type="date"
                        style={{ flex: 1, fontSize: 11, fontFamily: "'DM Sans', sans-serif", border: 'none', borderBottom: '1px solid #D9D8D6', outline: 'none', background: 'transparent', color: newExpenseDate ? '#1A1918' : '#9B9A98', padding: '2px 0' }} />
                      <button type="submit" style={{ background: '#03ACEA', border: 'none', cursor: 'pointer', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Add</button>
                    </div>
                  </form>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" onClick={() => { setAddingExpense(v => !v); setNewExpenseLabel(''); setNewExpenseAmount(''); setNewExpenseDate(''); setNewExpenseDir('out'); }}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: addingExpense ? '#EBF4FA' : '#F4F3F1', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Add expense">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={addingExpense ? '#03ACEA' : '#787776'} strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right: summary breakdown ── */}
            <div className="plan-summary-box" style={{ flex: '0 0 auto', width: 200, background: '#FEFEFE', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.10)', padding: '14px 16px', fontFamily: "'DM Sans', sans-serif" }}>
              {/* Income */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Income</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: '#787776' }}>Repayments received</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#03ACEA' }}>{formatMoney(loanIncomeTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#787776' }}>Additional income</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#03ACEA' }}>{formatMoney(customIncomeTotal)}</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1918' }}>Total Income</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#03ACEA' }}>{formatMoney(totalIncome)}</span>
                </div>
              </div>

              {/* Expenses */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Expenses</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: '#787776' }}>Repayments sent</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1D5B94' }}>{formatMoney(loanExpenseTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#787776' }}>Additional expenses</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1D5B94' }}>{formatMoney(customExpenseTotal)}</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1918' }}>Total Expenses</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1D5B94' }}>{formatMoney(totalExpenses)}</span>
                </div>
              </div>

              {/* Net */}
              <div style={{ borderTop: '1.5px solid rgba(0,0,0,0.13)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1918' }}>Net {monthName}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: netTotal >= 0 ? '#03ACEA' : '#1D5B94' }}>{netTotal >= 0 ? '+' : '-'}{formatMoney(Math.abs(netTotal))}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer" style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
        <div className="dashboard-footer-links" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="https://www.vony-lending.com/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Terms of Service</a>
          <a href="https://www.vony-lending.com/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Privacy Center</a>
          <a href="https://www.vony-lending.com/do-not-sell" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Do not sell or share my personal information</a>
        </div>
      </div>
    </div>
  );
}

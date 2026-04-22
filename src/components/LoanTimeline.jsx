import React, { useState, useRef, useEffect } from 'react';
import { startOfMonth, endOfMonth, addMonths, addDays, format } from 'date-fns';
import { formatMoney } from '@/components/utils/formatMoney';

const RANGE_OPTIONS = [
  { value: '1m',  label: '1 month'  },
  { value: '3m',  label: '3 months' },
  { value: '6m',  label: '6 months' },
  { value: '1y',  label: '1 year'   },
  { value: 'all', label: 'All time' },
];

export default function LoanTimeline({ myLoans, safePayments, safeAllProfiles, userId }) {
  const [hoveredPt, setHoveredPt] = useState(null);
  const [range,     setRange]     = useState('6m');
  const scrollRef = useRef(null);
  const cardRef   = useRef(null);

  const LEND_COLOR  = '#03ACEA';
  const BORR_COLOR  = '#1D5B94';
  const LEND_FUTURE = '#9FD8F0';
  const BORR_FUTURE = '#7BA3C0';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMonthStart = startOfMonth(today);
  const MAX_FUTURE = addMonths(today, 120);

  const advDate = (d, freq) =>
    freq === 'weekly'    ? addDays(d, 7)  :
    freq === 'bi-weekly' ? addDays(d, 14) :
    addMonths(d, 1);

  const buildRawEvents = (isLending) => {
    const events = [];
    myLoans
      .filter(l => l && (isLending ? l.lender_id : l.borrower_id) === userId &&
        (l.status === 'active' || l.status === 'completed'))
      .forEach(loan => {
        const total = loan.total_amount || loan.amount || 0;
        const freq  = loan.payment_frequency || 'monthly';
        if (loan.created_at) {
          events.push({ date: new Date(loan.created_at), delta: +total });
        }
        safePayments.filter(p => p && p.loan_id === loan.id && p.status === 'completed').forEach(p => {
          events.push({ date: new Date(p.payment_date || p.created_at), delta: -(p.amount || 0) });
        });
        if (loan.status === 'active' && loan.next_payment_date && (loan.payment_amount || 0) > 0) {
          let rem = Math.max(0, total - (loan.amount_paid || 0));
          let d   = new Date(loan.next_payment_date);
          while (rem > 0.01 && d <= MAX_FUTURE) {
            if (d > today) {
              const pay = Math.min(loan.payment_amount, rem);
              events.push({ date: new Date(d), delta: -pay });
              rem -= pay;
            }
            d = advDate(d, freq);
          }
        }
      });
    return events.sort((a, b) => a.date - b.date);
  };

  const lendingRaw   = buildRawEvents(true);
  const borrowingRaw = buildRawEvents(false);
  const allRaw = [...lendingRaw, ...borrowingRaw];
  if (allRaw.length === 0) return null;

  const balAt = (events, date) => {
    let b = 0;
    events.forEach(e => { if (e.date <= date) b += e.delta; });
    return Math.max(0, b);
  };

  const rangeStart = (() => {
    if (range === 'all') {
      const past = allRaw.filter(e => e.date <= today).map(e => e.date);
      return startOfMonth(past.length > 0 ? new Date(Math.min(...past)) : today);
    }
    const m = range === '1m' ? 1 : range === '3m' ? 3 : range === '6m' ? 6 : 12;
    return startOfMonth(addMonths(today, -m));
  })();

  const xViewEnd    = addMonths(today, 1);
  const futureDates = allRaw.filter(e => e.date > today).map(e => e.date);
  const xEnd = futureDates.length > 0
    ? addMonths(startOfMonth(new Date(Math.max(...futureDates))), 1)
    : addMonths(today, 2);

  const monthTicks = [];
  let mc = new Date(rangeStart);
  while (mc <= xEnd) { monthTicks.push(new Date(mc)); mc = addMonths(mc, 1); }

  const makeMonthlyDots = (events, line) =>
    monthTicks.map(m => {
      const isCurrent     = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
      const isFutureMonth = startOfMonth(m) > todayMonthStart;
      const snapDate      = isCurrent ? today : endOfMonth(m);
      const balance       = balAt(events, snapDate);
      return {
        month: m,
        balance,
        isFuture: isFutureMonth,
        label: line === 'lending'
          ? `Owed to you: ${formatMoney(balance)}`
          : `You owe: ${formatMoney(balance)}`,
      };
    });

  const lendingDots   = makeMonthlyDots(lendingRaw,  'lending');
  const borrowingDots = makeMonthlyDots(borrowingRaw, 'borrowing');

  const hasLending   = lendingDots.some(d => d.balance > 0);
  const hasBorrowing = borrowingDots.some(d => d.balance > 0);
  if (!hasLending && !hasBorrowing) return null;

  const PX_PER_MONTH = 80;
  const SH = 148, PL = 6, PR = 16, PT = 14, PB = 26;
  const plotH = SH - PT - PB;
  const SW    = Math.max(monthTicks.length * PX_PER_MONTH, 320);
  const plotW = SW - PL - PR;
  const span  = Math.max(xEnd - rangeStart, 1);

  const maxBal = Math.max(
    ...[...lendingDots, ...borrowingDots].map(d => d.balance),
    1
  );

  const xOf = d => PL + ((d - rangeStart) / span) * plotW;
  const yOf = b => PT + plotH - (b / maxBal) * plotH;

  const dotsPolyStr = (dots) =>
    dots.map(d => `${xOf(d.month).toFixed(1)},${yOf(d.balance).toFixed(1)}`).join(' ');

  useEffect(() => {
    if (!scrollRef.current) return;
    const cw = scrollRef.current.clientWidth || 380;
    const xViewEndPx = PL + ((xViewEnd - rangeStart) / span) * plotW;
    scrollRef.current.scrollLeft = Math.max(0, xViewEndPx - cw + PR + 20);
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCircleClick = (e, dot, k) => {
    e.stopPropagation();
    if (hoveredPt?.key === k) { setHoveredPt(null); return; }
    const cardRect = cardRef.current?.getBoundingClientRect();
    if (!cardRect) return;
    const cr = e.target.getBoundingClientRect();
    setHoveredPt({
      ...dot, key: k,
      tipX: cr.left + cr.width / 2 - cardRect.left,
      tipY: cr.top - cardRect.top,
    });
  };

  return (
    <div ref={cardRef} style={{ position: 'relative', minWidth: 0 }} onClick={() => setHoveredPt(null)}>
      <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, padding: '14px 18px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>
            Balance History
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {hasLending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: LEND_COLOR }} /> Lending
              </div>
            )}
            {hasBorrowing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: BORR_COLOR }} /> Borrowing
              </div>
            )}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
              <select
                value={range}
                onChange={e => { setRange(e.target.value); setHoveredPt(null); }}
                style={{
                  fontSize: 11, fontWeight: 500, color: '#03ACEA',
                  background: 'transparent', border: 'none', outline: 'none',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  appearance: 'none', WebkitAppearance: 'none',
                  paddingRight: 13, lineHeight: 1,
                }}
              >
                {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                width="8" height="8" viewBox="0 0 24 24" fill="none"
                stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Scrollable chart */}
        <div
          ref={scrollRef}
          style={{ overflowX: 'auto', position: 'relative', userSelect: 'none', width: '100%',
            scrollbarWidth: 'thin', scrollbarColor: '#E0DFDD transparent' }}
        >
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} style={{ display: 'block', overflow: 'visible' }}>
            {[0.33, 0.67, 1].map((f, i) => (
              <line key={i} x1={PL} y1={yOf(maxBal * f)} x2={SW - PR} y2={yOf(maxBal * f)} stroke="#F0EFEE" strokeWidth="1" />
            ))}
            <line x1={PL} y1={PT + plotH} x2={SW - PR} y2={PT + plotH} stroke="#ECEAE8" strokeWidth="1" />
            {xOf(today) >= PL && xOf(today) <= SW - PR && (
              <line x1={xOf(today)} y1={PT} x2={xOf(today)} y2={PT + plotH} stroke="#D9D8D6" strokeWidth="1" strokeDasharray="3,3" />
            )}
            {monthTicks.map((m, i) => (
              <text key={i} x={xOf(m)} y={SH - 5} fontSize="8" fill="#C5C3C0" textAnchor="middle" fontFamily="DM Sans,sans-serif">
                {format(m, 'MMM')}
              </text>
            ))}
            {hasLending && (
              <polyline points={dotsPolyStr(lendingDots)} fill="none" stroke={LEND_COLOR} strokeWidth="1.5" strokeLinejoin="round" />
            )}
            {hasBorrowing && (
              <polyline points={dotsPolyStr(borrowingDots)} fill="none" stroke={BORR_COLOR} strokeWidth="1.5" strokeLinejoin="round" />
            )}
            {hasLending && lendingDots.map((d, i) => {
              const k = `l${i}`;
              const isHov = hoveredPt?.key === k;
              return (
                <circle key={k}
                  cx={xOf(d.month)} cy={yOf(d.balance)}
                  r={isHov ? 5.5 : 4}
                  fill={d.isFuture ? LEND_FUTURE : LEND_COLOR}
                  stroke="white" strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                  onClick={e => handleCircleClick(e, d, k)}
                />
              );
            })}
            {hasBorrowing && borrowingDots.map((d, i) => {
              const k = `b${i}`;
              const isHov = hoveredPt?.key === k;
              return (
                <circle key={k}
                  cx={xOf(d.month)} cy={yOf(d.balance)}
                  r={isHov ? 5.5 : 4}
                  fill={d.isFuture ? BORR_FUTURE : BORR_COLOR}
                  stroke="white" strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                  onClick={e => handleCircleClick(e, d, k)}
                />
              );
            })}
          </svg>
        </div>

        {/* Tooltip */}
        {hoveredPt && (() => {
          const TW    = 170;
          const cardW = cardRef.current?.getBoundingClientRect().width || 320;
          const tipX  = Math.max(8, Math.min(hoveredPt.tipX - TW / 2, cardW - TW - 8));
          const tipY  = hoveredPt.tipY - 54;
          return (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', left: tipX,
                top: tipY < 10 ? hoveredPt.tipY + 10 : tipY,
                background: '#1A1918', color: 'white',
                borderRadius: 7, padding: '6px 10px',
                fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                zIndex: 30, whiteSpace: 'nowrap',
                boxShadow: '0 3px 12px rgba(0,0,0,0.22)',
                pointerEvents: 'none', lineHeight: 1.35,
              }}
            >
              <div style={{ fontWeight: 600 }}>{hoveredPt.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 2, fontSize: 10 }}>
                {format(hoveredPt.month, 'MMM yyyy')}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

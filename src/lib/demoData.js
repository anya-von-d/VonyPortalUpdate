/**
 * Demo mode sample data.
 *
 * All dates are calculated RELATIVE to "now" so the demo always looks healthy
 * no matter when investors open the app. A mix of lending & borrowing, a
 * variety of reasons, and some completed history to show Vony's breadth.
 *
 * The current authenticated user becomes "you" (uid passed in). Other people
 * are fake peers with stable synthetic IDs.
 */

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();
const dateOnly = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

// Stable fake peer ids
const PEERS = {
  maya:    'demo-peer-maya-0001',
  jordan:  'demo-peer-jordan-0002',
  sofia:   'demo-peer-sofia-0003',
  alex:    'demo-peer-alex-0004',
  priya:   'demo-peer-priya-0005',
  marcus:  'demo-peer-marcus-0006',
  elena:   'demo-peer-elena-0007',
};

export const getDemoPublicProfiles = (uid) => [
  { id: 'demo-pp-you', user_id: uid, username: 'you', full_name: 'You',
    profile_picture_url: `https://ui-avatars.com/api/?name=You&background=54A6CF&color=fff&size=128` },
  { id: 'demo-pp-maya',   user_id: PEERS.maya,   username: 'mayac',    full_name: 'Maya Chen',
    profile_picture_url: 'https://ui-avatars.com/api/?name=Maya+Chen&background=E8A87C&color=fff&size=128' },
  { id: 'demo-pp-jordan', user_id: PEERS.jordan, username: 'jordanp',  full_name: 'Jordan Park',
    profile_picture_url: 'https://ui-avatars.com/api/?name=Jordan+Park&background=85B79D&color=fff&size=128' },
  { id: 'demo-pp-sofia',  user_id: PEERS.sofia,  username: 'sofiar',   full_name: 'Sofia Rivera',
    profile_picture_url: 'https://ui-avatars.com/api/?name=Sofia+Rivera&background=C38D9E&color=fff&size=128' },
  { id: 'demo-pp-alex',   user_id: PEERS.alex,   username: 'alexk',    full_name: 'Alex Kim',
    profile_picture_url: 'https://ui-avatars.com/api/?name=Alex+Kim&background=41B3A3&color=fff&size=128' },
  { id: 'demo-pp-priya',  user_id: PEERS.priya,  username: 'priyan',   full_name: 'Priya Nair',
    profile_picture_url: 'https://ui-avatars.com/api/?name=Priya+Nair&background=F4B942&color=fff&size=128' },
  { id: 'demo-pp-marcus', user_id: PEERS.marcus, username: 'marcusw',  full_name: 'Marcus Wright',
    profile_picture_url: 'https://ui-avatars.com/api/?name=Marcus+Wright&background=6C8EBF&color=fff&size=128' },
  { id: 'demo-pp-elena',  user_id: PEERS.elena,  username: 'elenat',   full_name: 'Elena Torres',
    profile_picture_url: 'https://ui-avatars.com/api/?name=Elena+Torres&background=B084CC&color=fff&size=128' },
];

export const getDemoFriendships = (uid) => [
  { id: 'demo-fr-1', user_id: uid, friend_id: PEERS.maya,   status: 'accepted', created_at: iso(-120) },
  { id: 'demo-fr-2', user_id: uid, friend_id: PEERS.jordan, status: 'accepted', created_at: iso(-100) },
  { id: 'demo-fr-3', user_id: uid, friend_id: PEERS.sofia,  status: 'accepted', created_at: iso(-80) },
  { id: 'demo-fr-4', user_id: uid, friend_id: PEERS.alex,   status: 'accepted', created_at: iso(-60) },
  { id: 'demo-fr-5', user_id: uid, friend_id: PEERS.priya,  status: 'accepted', created_at: iso(-45) },
  { id: 'demo-fr-6', user_id: uid, friend_id: PEERS.marcus, status: 'accepted', created_at: iso(-30) },
  { id: 'demo-fr-7', user_id: PEERS.elena, friend_id: uid,  status: 'pending',  created_at: iso(-2) },
];

export const getDemoLoans = (uid) => [
  // ── LENDING (you are the lender) ──
  {
    id: 'demo-loan-1',
    lender_id: uid,
    borrower_id: PEERS.maya,
    amount: 600,
    total_amount: 600,
    amount_paid: 400,
    payment_amount: 100,
    next_payment_date: dateOnly(8),
    status: 'active',
    reason: 'Flight home for the holidays',
    created_at: iso(-150),
    start_date: dateOnly(-150),
  },
  {
    id: 'demo-loan-2',
    lender_id: uid,
    borrower_id: PEERS.jordan,
    amount: 1200,
    total_amount: 1200,
    amount_paid: 300,
    payment_amount: 150,
    next_payment_date: dateOnly(14),
    status: 'active',
    reason: 'First-month rent while between jobs',
    created_at: iso(-90),
    start_date: dateOnly(-90),
  },
  {
    id: 'demo-loan-3',
    lender_id: uid,
    borrower_id: PEERS.sofia,
    amount: 250,
    total_amount: 250,
    amount_paid: 250,
    payment_amount: 250,
    next_payment_date: null,
    status: 'completed',
    reason: 'Concert tickets split',
    created_at: iso(-60),
    start_date: dateOnly(-60),
  },
  {
    id: 'demo-loan-4',
    lender_id: uid,
    borrower_id: PEERS.priya,
    amount: 450,
    total_amount: 450,
    amount_paid: 0,
    payment_amount: 150,
    next_payment_date: dateOnly(21),
    status: 'active',
    reason: 'Textbooks for the semester',
    created_at: iso(-10),
    start_date: dateOnly(-10),
  },

  // ── BORROWING (you are the borrower) ──
  {
    id: 'demo-loan-5',
    lender_id: PEERS.alex,
    borrower_id: uid,
    amount: 800,
    total_amount: 800,
    amount_paid: 500,
    payment_amount: 100,
    next_payment_date: dateOnly(5),
    status: 'active',
    reason: 'Laptop repair after coffee spill',
    created_at: iso(-100),
    start_date: dateOnly(-100),
  },
  {
    id: 'demo-loan-6',
    lender_id: PEERS.marcus,
    borrower_id: uid,
    amount: 2000,
    total_amount: 2000,
    amount_paid: 500,
    payment_amount: 250,
    next_payment_date: dateOnly(18),
    status: 'active',
    reason: 'Security deposit on new apartment',
    created_at: iso(-75),
    start_date: dateOnly(-75),
  },
  {
    id: 'demo-loan-7',
    lender_id: PEERS.elena,
    borrower_id: uid,
    amount: 180,
    total_amount: 180,
    amount_paid: 180,
    payment_amount: 180,
    next_payment_date: null,
    status: 'completed',
    reason: 'Birthday dinner I hosted',
    created_at: iso(-40),
    start_date: dateOnly(-40),
  },

  // ── PENDING OFFER (someone offering to lend YOU) — shows the approval flow ──
  {
    id: 'demo-loan-8',
    lender_id: PEERS.jordan,
    borrower_id: uid,
    amount: 350,
    total_amount: 350,
    amount_paid: 0,
    payment_amount: 175,
    next_payment_date: dateOnly(30),
    status: 'pending',
    reason: 'Studio time for your EP',
    created_at: iso(-1),
    start_date: dateOnly(0),
  },
];

export const getDemoPayments = (uid) => [
  // Completed history — shows a healthy track record
  { id: 'demo-pay-1', loan_id: 'demo-loan-1', amount: 100, status: 'completed',
    payment_date: dateOnly(-120), recorded_by: PEERS.maya, created_at: iso(-120) },
  { id: 'demo-pay-2', loan_id: 'demo-loan-1', amount: 100, status: 'completed',
    payment_date: dateOnly(-90),  recorded_by: PEERS.maya, created_at: iso(-90) },
  { id: 'demo-pay-3', loan_id: 'demo-loan-1', amount: 100, status: 'completed',
    payment_date: dateOnly(-60),  recorded_by: PEERS.maya, created_at: iso(-60) },
  { id: 'demo-pay-4', loan_id: 'demo-loan-1', amount: 100, status: 'completed',
    payment_date: dateOnly(-30),  recorded_by: PEERS.maya, created_at: iso(-30) },

  { id: 'demo-pay-5', loan_id: 'demo-loan-2', amount: 150, status: 'completed',
    payment_date: dateOnly(-60),  recorded_by: PEERS.jordan, created_at: iso(-60) },
  { id: 'demo-pay-6', loan_id: 'demo-loan-2', amount: 150, status: 'completed',
    payment_date: dateOnly(-30),  recorded_by: PEERS.jordan, created_at: iso(-30) },

  { id: 'demo-pay-7', loan_id: 'demo-loan-3', amount: 250, status: 'completed',
    payment_date: dateOnly(-35),  recorded_by: PEERS.sofia, created_at: iso(-35) },

  { id: 'demo-pay-8',  loan_id: 'demo-loan-5', amount: 100, status: 'completed',
    payment_date: dateOnly(-85),  recorded_by: uid, created_at: iso(-85) },
  { id: 'demo-pay-9',  loan_id: 'demo-loan-5', amount: 100, status: 'completed',
    payment_date: dateOnly(-55),  recorded_by: uid, created_at: iso(-55) },
  { id: 'demo-pay-10', loan_id: 'demo-loan-5', amount: 100, status: 'completed',
    payment_date: dateOnly(-25),  recorded_by: uid, created_at: iso(-25) },
  { id: 'demo-pay-11', loan_id: 'demo-loan-5', amount: 100, status: 'completed',
    payment_date: dateOnly(-5),   recorded_by: uid, created_at: iso(-5) },
  { id: 'demo-pay-12', loan_id: 'demo-loan-5', amount: 100, status: 'completed',
    payment_date: dateOnly(-40),  recorded_by: uid, created_at: iso(-40) },

  { id: 'demo-pay-13', loan_id: 'demo-loan-6', amount: 250, status: 'completed',
    payment_date: dateOnly(-45),  recorded_by: uid, created_at: iso(-45) },
  { id: 'demo-pay-14', loan_id: 'demo-loan-6', amount: 250, status: 'completed',
    payment_date: dateOnly(-15),  recorded_by: uid, created_at: iso(-15) },

  { id: 'demo-pay-15', loan_id: 'demo-loan-7', amount: 180, status: 'completed',
    payment_date: dateOnly(-20),  recorded_by: uid, created_at: iso(-20) },

  // PENDING confirmation — a peer recorded a payment, waiting for you to confirm
  { id: 'demo-pay-16', loan_id: 'demo-loan-1', amount: 100, status: 'pending_confirmation',
    payment_date: dateOnly(-1),   recorded_by: PEERS.maya, created_at: iso(-1) },

  // PENDING confirmation — you recorded a payment on a loan you borrowed, peer hasn't confirmed
  { id: 'demo-pay-17', loan_id: 'demo-loan-6', amount: 250, status: 'pending_confirmation',
    payment_date: dateOnly(-2),   recorded_by: uid, created_at: iso(-2) },
];

export const getDemoLoanAgreements = () => [];

// Convenience selector used by entity wrappers
export const getDemoDataset = (uid) => ({
  public_profiles: getDemoPublicProfiles(uid),
  friendships:     getDemoFriendships(uid),
  loans:           getDemoLoans(uid),
  payments:        getDemoPayments(uid),
  loan_agreements: getDemoLoanAgreements(),
});

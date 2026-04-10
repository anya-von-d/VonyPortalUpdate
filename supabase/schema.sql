-- Core tables
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  username text unique,
  theme_preference text default 'morning',
  profile_picture_url text,
  phone text,
  location text,
  role text default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  username text,
  full_name text,
  profile_picture_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  lender_id uuid references profiles(id) on delete cascade,
  borrower_id uuid references profiles(id) on delete cascade,
  amount numeric not null,
  interest_rate numeric not null,
  repayment_period int not null,
  payment_frequency text default 'monthly',
  status text default 'pending',
  declined_by text,
  purpose text,
  due_date date,
  total_amount numeric,
  amount_paid numeric default 0,
  next_payment_date date,
  payment_amount numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists loan_agreements (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid unique references loans(id) on delete cascade,
  lender_id uuid references profiles(id) on delete cascade,
  lender_name text,
  lender_signed_date timestamptz,
  lender_screenshot_url text,
  borrower_id uuid references profiles(id) on delete cascade,
  borrower_name text,
  borrower_signed_date timestamptz,
  borrower_screenshot_url text,
  amount numeric,
  interest_rate numeric,
  repayment_period int,
  payment_frequency text,
  purpose text,
  due_date date,
  total_amount numeric,
  payment_amount numeric,
  is_fully_signed boolean default false,
  cancelled_by text,
  cancelled_date timestamptz,
  cancellation_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references loans(id) on delete cascade,
  amount numeric not null,
  payment_date date,
  status text default 'completed',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists paypal_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  paypal_email text not null,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists venmo_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  venmo_username text not null,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  friend_id uuid references profiles(id) on delete cascade,
  status text default 'pending',
  is_starred boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table friendships enable row level security;
alter table public_profiles enable row level security;
alter table loans enable row level security;
alter table loan_agreements enable row level security;
alter table payments enable row level security;
alter table paypal_connections enable row level security;
alter table venmo_connections enable row level security;

create policy "profiles read own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles update own"
  on profiles for update
  using (auth.uid() = id);

create policy "public_profiles read all"
  on public_profiles for select
  using (true);

create policy "public_profiles write own"
  on public_profiles for insert
  with check (auth.uid() = user_id);

create policy "public_profiles update own"
  on public_profiles for update
  using (auth.uid() = user_id);

create policy "loans read own"
  on loans for select
  using (auth.uid() = lender_id or auth.uid() = borrower_id);

create policy "loans insert lender"
  on loans for insert
  with check (auth.uid() = lender_id);

create policy "loans update participants"
  on loans for update
  using (auth.uid() = lender_id or auth.uid() = borrower_id);

create policy "loan_agreements read participants"
  on loan_agreements for select
  using (auth.uid() = lender_id or auth.uid() = borrower_id);

create policy "loan_agreements insert participants"
  on loan_agreements for insert
  with check (auth.uid() = lender_id or auth.uid() = borrower_id);

create policy "loan_agreements update participants"
  on loan_agreements for update
  using (auth.uid() = lender_id or auth.uid() = borrower_id);

create policy "payments read participants"
  on payments for select
  using (
    exists (
      select 1 from loans
      where loans.id = payments.loan_id
        and (loans.lender_id = auth.uid() or loans.borrower_id = auth.uid())
    )
  );

create policy "payments insert participants"
  on payments for insert
  with check (
    exists (
      select 1 from loans
      where loans.id = payments.loan_id
        and (loans.borrower_id = auth.uid() or loans.lender_id = auth.uid())
    )
  );

create policy "paypal_connections read own"
  on paypal_connections for select
  using (auth.uid() = user_id);

create policy "paypal_connections write own"
  on paypal_connections for insert
  with check (auth.uid() = user_id);

create policy "paypal_connections update own"
  on paypal_connections for update
  using (auth.uid() = user_id);

create policy "paypal_connections delete own"
  on paypal_connections for delete
  using (auth.uid() = user_id);

create policy "venmo_connections read own"
  on venmo_connections for select
  using (auth.uid() = user_id);

create policy "venmo_connections write own"
  on venmo_connections for insert
  with check (auth.uid() = user_id);

create policy "venmo_connections update own"
  on venmo_connections for update
  using (auth.uid() = user_id);

create policy "venmo_connections delete own"
  on venmo_connections for delete
  using (auth.uid() = user_id);

create policy "friendships read own"
  on friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships insert own"
  on friendships for insert
  with check (auth.uid() = user_id);

create policy "friendships update participants"
  on friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships delete own"
  on friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

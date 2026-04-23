import { supabase } from '@/lib/supabaseClient';
import { isDemoModeActive } from '@/lib/DemoModeContext';
import { getDemoDataset } from '@/lib/demoData';

// ── Demo-mode helpers ────────────────────────────────────────────────────────
// When demo mode is on, reads (list/filter) for certain tables return sample
// data instead of hitting Supabase. Writes (create/update/delete) are
// swallowed — the UI updates optimistically in page state, but nothing
// persists. This keeps real accounts clean while letting investors click
// around.
const DEMO_TABLES = new Set(['loans', 'payments', 'friendships', 'public_profiles', 'loan_agreements']);

const getCurrentUserIdCached = (() => {
  let cached = null;
  let inflight = null;
  return () => {
    if (cached) return Promise.resolve(cached);
    if (inflight) return inflight;
    inflight = supabase.auth.getUser().then(({ data }) => {
      cached = data?.user?.id || 'demo-user-self';
      inflight = null;
      return cached;
    }).catch(() => 'demo-user-self');
    return inflight;
  };
})();

const applyOrder = (rows, order) => {
  if (!order) return rows;
  const isDesc = order.startsWith('-');
  const field = isDesc ? order.slice(1) : order;
  return [...rows].sort((a, b) => {
    const av = a?.[field], bv = b?.[field];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av < bv ? -1 : 1) * (isDesc ? -1 : 1);
  });
};

const applyFilters = (rows, filters) => {
  if (!filters || filters.length === 0) return rows;
  return rows.filter(row => filters.every(({ key, value }) => row?.[key] === value));
};

const demoList = async (tableName, order, limit) => {
  const uid = await getCurrentUserIdCached();
  const dataset = getDemoDataset(uid);
  let rows = dataset[tableName] || [];
  rows = applyOrder(rows, order);
  if (limit) rows = rows.slice(0, limit);
  return rows;
};

const demoFilter = async (tableName, queryObj, order, limit) => {
  const uid = await getCurrentUserIdCached();
  const dataset = getDemoDataset(uid);
  const filters = normalizeFilter(queryObj);
  let rows = applyFilters(dataset[tableName] || [], filters);
  rows = applyOrder(rows, order);
  if (limit) rows = rows.slice(0, limit);
  return rows;
};

const parseOrder = (order) => {
  if (!order) return null;
  const isDesc = order.startsWith('-');
  const field = isDesc ? order.slice(1) : order;
  return { field, ascending: !isDesc };
};

const normalizeFilter = (query) => {
  if (!query || typeof query !== 'object') return [];
  return Object.entries(query).map(([key, value]) => {
    if (value && typeof value === 'object' && 'eq' in value) {
      return { key, op: 'eq', value: value.eq };
    }
    return { key, op: 'eq', value };
  });
};

const createTableApi = (tableName) => ({
  async list(order = null, limit = null) {
    if (isDemoModeActive() && DEMO_TABLES.has(tableName)) {
      return demoList(tableName, order, limit);
    }
    let query = supabase.from(tableName).select('*');
    const orderConfig = parseOrder(order);
    if (orderConfig) {
      query = query.order(orderConfig.field, { ascending: orderConfig.ascending });
    }
    if (limit) {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },
  async filter(queryObj, order = null, limit = null) {
    if (isDemoModeActive() && DEMO_TABLES.has(tableName)) {
      return demoFilter(tableName, queryObj, order, limit);
    }
    let query = supabase.from(tableName).select('*');
    const filters = normalizeFilter(queryObj);
    filters.forEach(({ key, op, value }) => {
      if (op === 'eq') query = query.eq(key, value);
    });
    const orderConfig = parseOrder(order);
    if (orderConfig) {
      query = query.order(orderConfig.field, { ascending: orderConfig.ascending });
    }
    if (limit) {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },
  async create(payload) {
    if (isDemoModeActive() && DEMO_TABLES.has(tableName)) {
      return { id: `demo-${tableName}-${Date.now()}`, ...payload };
    }
    const { data, error } = await supabase
      .from(tableName)
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    if (isDemoModeActive() && DEMO_TABLES.has(tableName)) {
      return { id, ...payload };
    }
    const { data, error } = await supabase
      .from(tableName)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    if (isDemoModeActive() && DEMO_TABLES.has(tableName)) {
      return true;
    }
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  }
});

const getCurrentUserProfile = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData?.user) return null;
  const user = authData.user;
  const metadata = user.user_metadata || {};
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError;
  }
  if (!profile) {
    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: metadata.full_name ?? null,
        username: metadata.username ?? null
      })
      .select('*')
      .single();
    if (createError) throw createError;
    return {
      id: user.id,
      email: user.email,
      ...createdProfile
    };
  }
  // Prioritize profiles table data, only fall back to metadata if profile fields are empty
  return {
    id: user.id,
    email: user.email,
    ...profile,
    full_name: profile.full_name || metadata.full_name || '',
    username: profile.username || metadata.username || '',
  };
};

const updateCurrentUserProfile = async (payload) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData?.user) throw new Error('Not authenticated');
  const userId = authData.user.id;

  // Update the profiles table
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;

  // Also update auth user_metadata so it stays in sync
  const metadataUpdate = {};
  if (payload.full_name !== undefined) metadataUpdate.full_name = payload.full_name;
  if (payload.username !== undefined) metadataUpdate.username = payload.username;
  if (Object.keys(metadataUpdate).length > 0) {
    await supabase.auth.updateUser({ data: metadataUpdate });
  }

  return data;
};

export const User = {
  async me() {
    return getCurrentUserProfile();
  },
  async list(order = null, limit = null) {
    return createTableApi('profiles').list(order, limit);
  },
  async updateMyUserData(payload) {
    return updateCurrentUserProfile(payload);
  },
  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  },
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async redirectToLogin() {
    return User.loginWithGoogle();
  }
};

export const PublicProfile = createTableApi('public_profiles');
export const Loan = createTableApi('loans');
export const LoanAgreement = createTableApi('loan_agreements');
export const Payment = createTableApi('payments');
export const PayPalConnection = createTableApi('paypal_connections');
export const VenmoConnection = createTableApi('venmo_connections');
export const Friendship = createTableApi('friendships');

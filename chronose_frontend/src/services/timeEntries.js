import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for data layer (separate from authApi to use query builder).
 * Uses env vars; if unavailable, functions will return informative errors.
 */
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch {
    supabase = null;
  }
}

const err = (message, code = 'client_unavailable') => {
  const e = new Error(message);
  e.code = code;
  return e;
};

/**
 * Feature flags reader (not a React hook).
 * Expects REACT_APP_FEATURE_FLAGS as JSON or CSV key=true,false.
 * Default: enableRealData=true if Supabase is configured, else false.
 */
// PUBLIC_INTERFACE
export function getFeatureFlags() {
  /** Read feature flags from REACT_APP_FEATURE_FLAGS with safe defaults. */
  const raw = process.env.REACT_APP_FEATURE_FLAGS || '';
  const defaults = {
    enableRealData: !!(SUPABASE_URL && SUPABASE_KEY),
  };
  if (!raw) return defaults;

  try {
    // Try JSON first
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, typeof v === 'string' ? v.toLowerCase() === 'true' : !!v])
      ),
    };
  } catch {
    // CSV fallback: key1=true,key2=false
    const obj = {};
    raw
      .split(',')
      .map((p) => p.trim())
      .forEach((part) => {
        const [k, v] = part.split('=');
        if (k) obj[k] = (v || '').toLowerCase() === 'true';
      });
    return { ...defaults, ...obj };
  }
}

/**
 * Internal helper to map DB row to UI shape.
 */
function mapRow(r) {
  return {
    id: r.id,
    user_id: r.user_id,
    date: r.date, // yyyy-mm-dd
    project: r.project || '',
    task: r.task || '',
    hours: typeof r.hours === 'number' ? r.hours : Number(r.hours || 0),
    notes: r.notes || '',
    status: r.status || 'draft',
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/**
 * Detects a missing table or schema issue based on message/code text.
 */
function isMissingTable(error) {
  const msg = (error?.message || '').toLowerCase();
  return (
    (msg.includes('relation') && msg.includes('does not exist')) ||
    (msg.includes('table') && msg.includes('not exist')) ||
    error?.code === '42P01'
  );
}

// PUBLIC_INTERFACE
export async function listMyTimeEntries(userId) {
  /** List time entries for the given user, ordered by date desc. */
  const { enableRealData } = getFeatureFlags();
  if (!enableRealData || !supabase) {
    // Fallback to empty list without crashing
    return { data: [], error: err('Data not available yet', 'feature_disabled') };
  }
  try {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      if (isMissingTable(error)) {
        return { data: [], error: err('Data not available yet', 'missing_schema') };
      }
      return { data: [], error };
    }
    return { data: (data || []).map(mapRow), error: null };
  } catch (e) {
    return { data: [], error: err(e?.message || 'Failed to fetch time entries') };
  }
}

// PUBLIC_INTERFACE
export async function createTimeEntry(entry) {
  /** Create a new time entry for the current user. */
  const { enableRealData } = getFeatureFlags();
  if (!enableRealData || !supabase) {
    return { data: null, error: err('Data not available yet', 'feature_disabled') };
  }
  try {
    const payload = {
      user_id: entry.user_id,
      date: entry.date,
      project: entry.project || null,
      task: entry.task || null,
      hours: Number(entry.hours),
      notes: entry.notes || null,
      status: entry.status || 'draft',
    };
    const { data, error } = await supabase.from('time_entries').insert(payload).select().single();
    if (error) {
      if (isMissingTable(error)) {
        return { data: null, error: err('Data not available yet', 'missing_schema') };
      }
      return { data: null, error };
    }
    return { data: mapRow(data), error: null };
  } catch (e) {
    return { data: null, error: err(e?.message || 'Failed to create time entry') };
  }
}

// PUBLIC_INTERFACE
export async function updateTimeEntry(id, patch) {
  /** Update an existing time entry for the current user. */
  const { enableRealData } = getFeatureFlags();
  if (!enableRealData || !supabase) {
    return { data: null, error: err('Data not available yet', 'feature_disabled') };
  }
  try {
    const updates = {
      ...(patch.project !== undefined ? { project: patch.project } : {}),
      ...(patch.task !== undefined ? { task: patch.task } : {}),
      ...(patch.hours !== undefined ? { hours: Number(patch.hours) } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.date !== undefined ? { date: patch.date } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    };
    const { data, error } = await supabase.from('time_entries').update(updates).eq('id', id).select().single();
    if (error) {
      if (isMissingTable(error)) {
        return { data: null, error: err('Data not available yet', 'missing_schema') };
      }
      return { data: null, error };
    }
    return { data: mapRow(data), error: null };
  } catch (e) {
    return { data: null, error: err(e?.message || 'Failed to update time entry') };
  }
}

// PUBLIC_INTERFACE
export async function deleteTimeEntry(id) {
  /** Delete an existing time entry by id for the current user. */
  const { enableRealData } = getFeatureFlags();
  if (!enableRealData || !supabase) {
    return { data: null, error: err('Data not available yet', 'feature_disabled') };
  }
  try {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) {
      if (isMissingTable(error)) {
        return { data: null, error: err('Data not available yet', 'missing_schema') };
      }
      return { data: null, error };
    }
    return { data: { id }, error: null };
  } catch (e) {
    return { data: null, error: err(e?.message || 'Failed to delete time entry') };
  }
}

/**
 * PUBLIC_INTERFACE
 * validateEntryFields(values)
 * Minimal input validation for work entry fields. Returns { errors, valid }.
 */
export function validateEntryFields(values) {
  const errors = {};
  if (!values.date) errors.date = 'Please select a date.';
  if (values.hours === '' || values.hours === null || values.hours === undefined) {
    errors.hours = 'Please enter hours worked.';
  } else if (Number.isNaN(Number(values.hours))) {
    errors.hours = 'Hours must be a number.';
  } else if (Number(values.hours) < 0) {
    errors.hours = 'Hours cannot be negative.';
  } else if (Number(values.hours) > 24) {
    errors.hours = 'Hours cannot exceed 24.';
  }
  if (values.notes && values.notes.length > 500) {
    errors.notes = 'Notes must be 500 characters or fewer.';
  }
  // Project/Task optional for now; tighten later as schema evolves.
  return { errors, valid: Object.keys(errors).length === 0 };
}

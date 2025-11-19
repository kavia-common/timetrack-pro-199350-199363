import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listMyTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getFeatureFlags,
  validateEntryFields,
  saveDraftEntry,
  createOrSaveDraftEntry,
  listTimeEntriesWithType,
  listMyLeaveEntries,
} from '../services/timeEntries';

/**
 * Employee Dashboard (Timesheet + Status)
 * Now wired to Supabase-backed CRUD for "time_entries" via the service layer.
 * - Lists current user's entries in Status -> Work list
 * - Allows add/edit/delete from New Entry form and Status list
 * - Optimistic UI with fallback refetch post-mutation
 * - Graceful missing schema handling with user-facing message
 */

// PUBLIC_INTERFACE
export default function Dashboard() {
  const { user, signOut } = useAuth();

  // Header tabs: 'timesheet' | 'status'
  const [activeTab, setActiveTab] = useState('timesheet');

  // Timer state with persistence
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds for current running session
  const [lastSession, setLastSession] = useState(0); // seconds of most recent completed session
  const [todayTotal, setTodayTotal] = useState(0); // aggregate seconds for selected/current date
  const [autoCheckoutBanner, setAutoCheckoutBanner] = useState(null); // { message, dateISO } | null
  const tickRef = useRef(null);

  // Role dropdown (disabled for now; default Employee)
  const [role] = useState('employee');

  // Shared selected date context for calendar and New Entry
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10); // yyyy-mm-dd
  const [selectedDateISO, setSelectedDateISO] = useState(todayISO);

  // Calendar view: 'week' | 'month'
  const [calendarView, setCalendarView] = useState('week');

  // Right panel visibility
  const [showEntryPanel, setShowEntryPanel] = useState(true);

  // Work Entry local state
  const [entryDate, setEntryDate] = useState(selectedDateISO);
  const [hours, setHours] = useState('');
  const [workErrors, setWorkErrors] = useState({ hours: '', date: '' });
  const [notes, setNotes] = useState('');
  const [project, setProject] = useState('');
  const [task, setTask] = useState('');

  // Leave Request local state
  const [entryMode, setEntryMode] = useState('work'); // 'work' | 'leave'
  const [leaveType, setLeaveType] = useState('casual'); // casual | sick | vacation
  const [leaveDuration, setLeaveDuration] = useState('full'); // full | partial
  const [leaveHours, setLeaveHours] = useState(''); // 0-8 for partial
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveErrors, setLeaveErrors] = useState({
    date: '',
    leaveType: '',
    leaveDuration: '',
    leaveReason: '',
    leaveHours: '',
  });
  const LEAVE_MAX_HOURS = 8;

  // Status sub-tabs state and mock data
  const [statusSubTab, setStatusSubTab] = useState('work'); // 'work' | 'leave'

  // Remote data: time entries for current user
  const [workEntries, setWorkEntries] = useState([]);
  const [leaveEntries, setLeaveEntries] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');

  const { enableRealData } = getFeatureFlags();

  // Fetch work/leave entries as live lists
  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      if (!user) return;
      setLogsLoading(true);
      setLogsError('');
      // Fetch work (type === 'work')
      const { data: work, error: workError } = await listTimeEntriesWithType(user.id, "work");
      // Fetch leave (type === 'leave')
      const { data: leave, error: leaveError } = await listTimeEntriesWithType(user.id, "leave");

      if (!mounted) return;
      if ((workError && (!work || work.length === 0)) || (leaveError && (!leave || leave.length === 0))) {
        setLogsError(
          (workError?.code === 'missing_schema' || workError?.code === 'feature_disabled' ||
            leaveError?.code === 'missing_schema' || leaveError?.code === 'feature_disabled')
            ? 'Data not available yet'
            : (workError?.message || leaveError?.message || 'Failed to load entries')
        );
      }
      setWorkEntries(work || []);
      setLeaveEntries(leave || []);
      setLogsLoading(false);
    }
    fetchAll();
    return () => { mounted = false; };
  }, [user]);

  // Keep entryDate synced with selectedDateISO
  useEffect(() => {
    setEntryDate(selectedDateISO);
  }, [selectedDateISO]);

  // ========= Timer Utilities (frontend-only persistence) =========
  const STORAGE_KEY = 'chronose_timer_v1';

  const loadTimerState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { byDate: {} };
    } catch {
      return { byDate: {} };
    }
  };

  const saveTimerState = (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  };

  const getDayState = (iso) => {
    const data = loadTimerState();
    return data.byDate?.[iso] || { sessions: [], running: null, total: 0 };
  };

  const setDayState = (iso, updater) => {
    const data = loadTimerState();
    const prev = data.byDate?.[iso] || { sessions: [], running: null, total: 0 };
    const next = updater(prev);
    data.byDate = { ...(data.byDate || {}), [iso]: next };
    saveTimerState(data);
    return next;
  };

  // PUBLIC_INTERFACE
  const formatHMS = (totalSeconds) => {
    /** Format seconds to hh:mm:ss */
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const recalcTodayTotal = (iso) => {
    const day = getDayState(iso);
    const sessionsTotal = (day.sessions || []).reduce((acc, s) => acc + Math.max(0, Math.floor((s.end - s.start) / 1000)), 0);
    setTodayTotal(sessionsTotal);
  };

  // On mount, detect stale running session and close it at 12h
  useEffect(() => {
    const iso = todayISO;
    const day = getDayState(iso);
    if (day.running) {
      const startMs = day.running.start;
      const now = Date.now();
      const maxEnd = startMs + 12 * 3600 * 1000; // 12 hours cap
      if (now >= maxEnd) {
        // Auto close at 12h mark
        const capped = maxEnd;
        const next = setDayState(iso, (prev) => {
          const prevSessions = prev.sessions || [];
          return {
            ...prev,
            sessions: [...prevSessions, { start: startMs, end: capped }],
            running: null,
          };
        });
        const added = Math.floor((capped - startMs) / 1000);
        setLastSession(added);
        setIsRunning(false);
        setElapsed(0);
        setAutoCheckoutBanner({
          message: 'Automatically checked out after 12 hours to prevent stale session.',
          dateISO: iso,
        });
        // Recalculate aggregate
        const sessionsTotal = (next.sessions || []).reduce((acc, s) => acc + Math.max(0, Math.floor((s.end - s.start) / 1000)), 0);
        setTodayTotal(sessionsTotal);
      } else {
        // Resume running session
        setIsRunning(true);
        setElapsed(Math.floor((now - startMs) / 1000));
        recalcTodayTotal(iso);
      }
    } else {
      recalcTodayTotal(iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer ticking effect for running session
  useEffect(() => {
    if (isRunning) {
      tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isRunning]);

  const handleCheckIn = () => {
    if (isRunning) return;
    const iso = todayISO;
    const now = Date.now();
    // If there is an existing running for today, ignore; else start
    const day = getDayState(iso);
    if (!day.running) {
      setDayState(iso, (prev) => ({ ...prev, running: { start: now } }));
      setIsRunning(true);
      setElapsed(0);
      // Today total remains same during the run; will update on checkout
    }
  };

  const handleCheckOut = () => {
    if (!isRunning) return;
    const iso = todayISO;
    const now = Date.now();
    const current = getDayState(iso);
    if (current.running?.start) {
      const startMs = current.running.start;
      const dur = Math.max(0, Math.floor((now - startMs) / 1000));
      const next = setDayState(iso, (prev) => {
        const prevSessions = prev.sessions || [];
        return {
          ...prev,
          sessions: [...prevSessions, { start: startMs, end: now }],
          running: null,
        };
      });
      setIsRunning(false);
      setLastSession(dur);
      setElapsed(0);
      // Recalc aggregate
      const sessionsTotal = (next.sessions || []).reduce((acc, s) => acc + Math.max(0, Math.floor((s.end - s.start) / 1000)), 0);
      setTodayTotal(sessionsTotal);
    }
  };

  // When selected date changes, display its aggregated total (not only today)
  useEffect(() => {
    const day = getDayState(selectedDateISO);
    const sessionsTotal = (day.sessions || []).reduce((acc, s) => acc + Math.max(0, Math.floor((s.end - s.start) / 1000)), 0);
    setTodayTotal(sessionsTotal);
  }, [selectedDateISO]);

  // Helpers
  function toISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const formatDateReadable = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun .. 6=Sat
    const diffToMon = (day + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMon);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const weekDaysFrom = (startDate) => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  };

  const getMonthGrid = (dateInMonth) => {
    const d = new Date(dateInMonth);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    const firstDay = d;
    const firstDayWeekday = (firstDay.getDay() + 6) % 7; // 0=Mon .. 6=Sun
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDayWeekday);
    return Array.from({ length: 42 }, (_, i) => {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      return cellDate;
    });
  };

  // Derived calendar data
  const selectedDate = new Date(selectedDateISO);
  const weekStart = getStartOfWeek(selectedDate);
  const weekDates = weekDaysFrom(weekStart);

  const monthGridDates = getMonthGrid(selectedDate);
  const monthFirst = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthLast = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

  const isSameDayISO = (isoA, isoB) => isoA === isoB;

  const onClickDay = (dateObj) => {
    const iso = toISO(dateObj);
    setSelectedDateISO(iso);
    setShowEntryPanel(true);
  };

  const onClickToday = () => {
    const iso = toISO(new Date());
    setSelectedDateISO(iso);
  };

  // Logout handler used by header action
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Logout failed', e);
    }
  };

  const onDateChange = (e) => {
    const iso = e.target.value || todayISO;
    setSelectedDateISO(iso);
    setWorkErrors((prev) => ({ ...prev, date: '' }));
    setLeaveErrors((prev) => ({ ...prev, date: '' }));
  };

  // Validate hours input for Work Entry
  const validateHours = (val) => {
    if (val === '' || val === null || val === undefined) return 'Please enter hours worked.';
    const num = Number(val);
    if (Number.isNaN(num)) return 'Hours must be a number.';
    if (num < 0) return 'Hours cannot be negative.';
    if (num > 24) return 'Hours cannot exceed 24.';
    return '';
  };

  const onHoursChange = (e) => {
    const val = e.target.value;
    setHours(val);
    setWorkErrors((prev) => ({ ...prev, hours: '' }));
  };

  const clearFormOnly = () => {
    setProject('');
    setTask('');
    setNotes('');
    setHours('');
    setWorkErrors({ hours: '', date: '' });
    // Leave form clears
    setLeaveType('casual');
    setLeaveDuration('full');
    setLeaveHours('');
    setLeaveReason('');
    setLeaveErrors({
      date: '',
      leaveType: '',
      leaveDuration: '',
      leaveReason: '',
      leaveHours: '',
    });
  };

  const onClear = () => {
    clearFormOnly();
    setEntryDate(selectedDateISO);
    setEditingId(null);
  };

  // PUBLIC_INTERFACE
  const onClosePanel = () => {
    /** Close/hide the New Entry panel and clear any unsaved inputs. */
    clearFormOnly();
    setEditingId(null);
    setShowEntryPanel(false);
  };

  // Save draft for either work or leave; saves to Supabase for custom types
  const onSaveDraft = async () => {
    if (!user) {
      // eslint-disable-next-line no-console
      console.error('Not authenticated');
      return;
    }
    if (entryMode === 'work') {
      const entry = {
        user_id: user.id,
        date: selectedDateISO,
        project,
        task,
        hours: hours === '' ? null : Number(hours),
        notes,
      };
      const res = await saveDraftEntry({ entry, mode: 'work' });
      if (!res.error) {
        // refetch work entries
        const { data: w } = await listTimeEntriesWithType(user.id, "work");
        setWorkEntries(w || []);
        clearFormOnly();
      } else {
        setWorkErrors((prev) => ({ ...prev, submit: res.error.message || "Draft save failed" }));
        // Fallback: log error, no crash
      }
    } else {
      // leave draft
      const entry = {
        user_id: user.id,
        date: selectedDateISO,
        leave_type: leaveType,
        leave_duration: leaveDuration,
        leave_hours: leaveDuration === 'partial' ? Number(leaveHours || 0) : LEAVE_MAX_HOURS,
        leave_reason: leaveReason,
      };
      const res = await saveDraftEntry({ entry, mode: 'leave' });
      if (!res.error) {
        // refetch leave
        const { data: l } = await listTimeEntriesWithType(user.id, "leave");
        setLeaveEntries(l || []);
        clearFormOnly();
      } else {
        setLeaveErrors((prev) => ({ ...prev, submit: res.error.message || "Draft save failed" }));
      }
    }
  };

  // Editing support
  const [editingId, setEditingId] = useState(null);

  // Submit work entry (create or edit)
  const onSubmitWork = async (e) => {
    e.preventDefault();
    const { errors, valid } = validateEntryFields({
      date: selectedDateISO,
      hours,
      notes,
      project,
      task,
    });
    setWorkErrors((prev) => ({ ...prev, ...errors }));
    if (!valid) return;
    if (!user) {
      // eslint-disable-next-line no-console
      console.error('Not authenticated');
      return;
    }
    const base = {
      user_id: user.id,
      date: selectedDateISO,
      project,
      task,
      hours: Number(hours),
      notes,
      status: 'submitted',
    };
    if (!editingId) {
      // Create new work entry, submit status
      const res = await createOrSaveDraftEntry({ entry: base, mode: "work", status: "submitted" });
      if (!res.error) {
        const { data: w } = await listTimeEntriesWithType(user.id, "work");
        setWorkEntries(w || []);
        clearFormOnly();
        setEntryDate(selectedDateISO);
      } else {
        setWorkErrors((prev) => ({ ...prev, submit: res.error.message || "Failed to create entry" }));
      }
    } else {
      // Edit existing
      const old = workEntries.find((x) => x.id === editingId) || {};
      const { data, error } = await updateTimeEntry(editingId, { ...base, status: "submitted", type: "work" });
      if (error) {
        setWorkErrors((prev) => ({ ...prev, submit: error.message || "Failed to update entry" }));
        // Fallback reload entries
        const { data: w } = await listTimeEntriesWithType(user.id, "work");
        setWorkEntries(w || []);
      } else {
        setWorkEntries((prev) =>
          prev.map((x) => (x.id === editingId ? { ...old, ...data } : x))
        );
        setEditingId(null);
        clearFormOnly();
        setEntryDate(selectedDateISO);
      }
    }
  };

  // PUBLIC_INTERFACE
  const validateLeave = () => {
    /** Validate leave request fields; returns object with errors. */
    const errs = { date: '', leaveType: '', leaveDuration: '', leaveReason: '', leaveHours: '' };
    if (!selectedDateISO) errs.date = 'Please select a date.';
    if (!leaveType) errs.leaveType = 'Please select a leave type.';
    if (!leaveDuration) errs.leaveDuration = 'Please select a duration.';
    if (!leaveReason || leaveReason.trim().length === 0) {
      errs.leaveReason = 'Please provide a reason for your leave.';
    } else if (leaveReason.length > 300) {
      errs.leaveReason = 'Reason must be 300 characters or fewer.';
    }
    if (leaveDuration === 'partial') {
      if (leaveHours === '' || leaveHours === null) {
        errs.leaveHours = 'Please enter partial hours.';
      } else {
        const h = Number(leaveHours);
        if (Number.isNaN(h)) errs.leaveHours = 'Hours must be a number.';
        else if (h < 0) errs.leaveHours = 'Hours cannot be negative.';
        else if (h > LEAVE_MAX_HOURS) errs.leaveHours = `Hours cannot exceed ${LEAVE_MAX_HOURS}.`;
      }
    }
    return errs;
  };

  // Submit leave entry (immediate DB)
  const onSubmitLeave = async (e) => {
    e.preventDefault();
    const errs = validateLeave();
    setLeaveErrors(errs);
    const hasErr = Object.values(errs).some(Boolean);
    if (hasErr) return;
    if (!user) {
      // eslint-disable-next-line no-console
      console.error('Not authenticated');
      return;
    }
    const entry = {
      user_id: user.id,
      date: selectedDateISO,
      leave_type: leaveType,
      leave_duration: leaveDuration,
      leave_hours: leaveDuration === 'partial' ? Number(leaveHours || 0) : LEAVE_MAX_HOURS,
      leave_reason: leaveReason.trim(),
    };
    const res = await createOrSaveDraftEntry({ entry, mode: "leave", status: "submitted" });
    if (!res.error) {
      // refetch leave immediately
      const { data: l } = await listTimeEntriesWithType(user.id, "leave");
      setLeaveEntries(l || []);
      clearFormOnly();
    } else {
      setLeaveErrors((prev) => ({ ...prev, submit: res.error.message || "Failed to submit leave" }));
    }
  };

  // Actions for Status lists
  const canEditOrDelete = (status) => status !== 'approved';

  // Wire Edit actions to open panel and set date + tab
  const handleEditWork = (id) => {
    const it = workEntries.find((x) => x.id === id);
    if (!it) return;
    setSelectedDateISO(it.date);
    setProject(it.project || '');
    setTask(it.task || '');
    setNotes(it.notes || '');
    setHours(it.hours != null ? String(it.hours) : '');
    setEditingId(id);
    setEntryMode('work');
    setShowEntryPanel(true);
    setActiveTab('timesheet');
  };

  const handleDeleteWork = async (id) => {
    const backup = workEntries;
    setWorkEntries((prev) => prev.filter((it) => it.id !== id));
    const { error } = await deleteTimeEntry(id);
    if (error) {
      setWorkEntries(backup);
    } else if (user) {
      // Refetch work entries to sync
      const { data: w } = await listTimeEntriesWithType(user.id, "work");
      setWorkEntries(w || []);
    }
  };

  const handleEditLeave = (id) => {
    const it = leaveEntries.find((x) => x.id === id);
    if (!it) return;
    setSelectedDateISO(it.date);
    setLeaveType(it.leave_type || 'casual');
    setLeaveDuration(it.leave_duration || 'full');
    setLeaveHours(it.hours ? `${it.hours}` : '');
    setLeaveReason(it.leave_reason || '');
    setEditingId(id);
    setEntryMode('leave');
    setShowEntryPanel(true);
    setActiveTab('timesheet');
  };

  const handleDeleteLeave = async (id) => {
    const backup = leaveEntries;
    setLeaveEntries((prev) => prev.filter((it) => it.id !== id));
    const { error } = await deleteTimeEntry(id);
    if (error) {
      setLeaveEntries(backup);
    } else if (user) {
      // Refetch leave entries to sync
      const { data: l } = await listTimeEntriesWithType(user.id, "leave");
      setLeaveEntries(l || []);
    }
  };

  // Status tab content with sub-tabs and live lists
  const StatusView = (
    <div className="page">
      <section className="card" aria-label="Status Overview">
        <div className="card--header-dark" style={{ gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.2px', color: 'var(--on-dark)' }}>
              Status
            </div>
            <div style={{ fontSize: 12, color: 'var(--on-dark-muted)' }}>
              Review your work and leave submissions
            </div>
          </div>
          <div className="tabs" role="tablist" aria-label="Status Type">
            <button
              className={`tab ${statusSubTab === 'work' ? 'tab--active' : ''}`}
              role="tab"
              aria-selected={statusSubTab === 'work'}
              type="button"
              onClick={() => setStatusSubTab('work')}
            >
              Work Status
            </button>
            <button
              className={`tab ${statusSubTab === 'leave' ? 'tab--active' : ''}`}
              role="tab"
              aria-selected={statusSubTab === 'leave'}
              type="button"
              onClick={() => setStatusSubTab('leave')}
            >
              Leave Status
            </button>
          </div>
        </div>
        <div className="card--body" style={{ background: 'var(--surface-soft)' }}>
          {statusSubTab === 'work' ? (
            <div aria-label="Work Status List" style={{ display: 'grid', gap: 8 }}>
              {logsLoading && (
                <div
                  style={{
                    padding: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Loading entries…
                </div>
              )}
              {!logsLoading && logsError && (
                <div
                  role="alert"
                  style={{
                    padding: 12,
                    background: 'var(--warn-tint)',
                    border: '1px solid var(--warn)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-strong)',
                  }}
                >
                  {logsError}
                </div>
              )}
              {!logsLoading && !logsError && workEntries.length === 0 && (
                <div
                  style={{
                    padding: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  No work logs yet.
                </div>
              )}
              {!logsLoading && !logsError && workEntries.length > 0 && (
                <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflow: 'auto' }}>
                  {workEntries.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto auto',
                        gap: 8,
                        alignItems: 'center',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 12px',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>
                          {formatDateReadable(item.date)} • {item.hours}h
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.task || '—'}</div>
                      </div>
                      <StatusBadge status={item.status} />
                      {canEditOrDelete(item.status) ? (
                        <>
                          <button
                            className="btn btn--outline btn--sm"
                            type="button"
                            onClick={() => handleEditWork(item.id)}
                            aria-label={`Edit work log ${item.id}`}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn--outline btn--sm"
                            type="button"
                            onClick={() => handleDeleteWork(item.id)}
                            aria-label={`Delete work log ${item.id}`}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Locked</span>
                          <span />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div aria-label="Leave Status List" style={{ display: 'grid', gap: 8 }}>
              {leaveEntries.length === 0 ? (
                <div
                  style={{
                    padding: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  No leave requests yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflow: 'auto' }}>
                  {leaveEntries.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto auto',
                        gap: 8,
                        alignItems: 'center',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 12px',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>
                          {formatDateReadable(item.date)} • {item.leave_type || 'Leave'} • {item.leave_duration === 'full' ? 'Full' : `${item.hours}h`}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {(item.leave_reason || '').slice(0, 80)}
                        </div>
                      </div>
                      <StatusBadge status={item.status} />
                      {canEditOrDelete(item.status) ? (
                        <>
                          <button
                            className="btn btn--outline btn--sm"
                            type="button"
                            onClick={() => handleEditLeave(item.id)}
                            aria-label={`Edit leave request ${item.id}`}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn--outline btn--sm"
                            type="button"
                            onClick={() => handleDeleteLeave(item.id)}
                            aria-label={`Delete leave request ${item.id}`}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Locked</span>
                          <span />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const stats = useMemo(
    () => [
      { icon: '⏱️', label: 'Total Hours This Month', value: '0h' },
      { icon: '📅', label: 'Working Days', value: '0d' },
      { icon: '🕒', label: 'Avg Hours/Day', value: '0.0h' },
      { icon: '⚡', label: 'Overtime', value: '0h' },
      { icon: '🍃', label: 'Leaves Taken', value: '0' },
    ],
    []
  );

  // Calendar header label (range or month title)
  const calendarTitle =
    calendarView === 'week'
      ? (() => {
          const end = new Date(weekDates[6]);
          return `${weekDates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        })()
      : selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Top utility bar */}
      <div className="headerbar">
        <div className="cluster" aria-label="Section navigation">
          <button
            className={`chip ${activeTab === 'timesheet' ? 'chip--filled-primary' : ''}`}
            onClick={() => setActiveTab('timesheet')}
            aria-current={activeTab === 'timesheet' ? 'page' : undefined}
            type="button"
          >
            Timesheet
          </button>
          <button
            className={`chip ${activeTab === 'status' ? 'chip--filled-primary' : ''}`}
            onClick={() => setActiveTab('status')}
            aria-current={activeTab === 'status' ? 'page' : undefined}
            type="button"
          >
            Status
          </button>
          <span className="chip chip--tint-warn">Updated Just</span>
        </div>

        <div className="cluster" style={{ flexWrap: 'wrap' }}>
          {/* Role dropdown (disabled) */}
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }} htmlFor="role">
            Role:
          </label>
          <select
            id="role"
            className="select"
            aria-label="Role"
            value={role}
            disabled
            onChange={() => {}}
            style={{ cursor: 'not-allowed' }}
          >
            <option value="employee">Employee</option>
          </select>

          {/* Live timer widget */}
          <div className="timer-widget" aria-live="polite" style={timerStyles.container}>
            <div style={timerStyles.time} aria-label="Current session elapsed">
              {formatHMS(elapsed)}
            </div>
            <div style={timerStyles.actions}>
              {!isRunning ? (
                <button className="btn btn--primary" type="button" onClick={handleCheckIn} aria-label="Check In">
                  Check In
                </button>
              ) : (
                <button className="btn btn--primary" type="button" onClick={handleCheckOut} aria-label="Check Out">
                  Check Out
                </button>
              )}
            </div>
            <div style={timerStyles.last} aria-live="polite">
              <span style={{ marginRight: 8 }}>Last session: {lastSession > 0 ? formatHMS(lastSession) : '—'}</span>
              <span>Today total: {formatHMS(todayTotal)}</span>
            </div>
          </div>

          <div style={{ width: 8 }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email}</span>
          <button
            className="btn btn--outline"
            style={{ height: 32, padding: '0 12px', borderRadius: 8 }}
            onClick={handleLogout}
            type="button"
            aria-label="Log out"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Auto-checkout non-blocking toast/banner */}
      {autoCheckoutBanner && (
        <div role="status" aria-live="polite" style={toastStyles.banner}>
          <div>{autoCheckoutBanner.message}</div>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setAutoCheckoutBanner(null)}
            aria-label="Dismiss notification"
            style={{ height: 28 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* View routing */}
      {activeTab === 'status' ? (
        StatusView
      ) : (
        <div className="page">
          {/* Summary card */}
          <section className="card" aria-label="Timesheet Logger Summary" style={{ background: 'var(--surface-elev)' }}>
            <div className="card--header-dark">
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.2px', color: 'var(--on-dark)' }}>
                  Timesheet Logger
                </div>
                <div style={{ fontSize: 12, color: 'var(--on-dark-muted)', fontWeight: 500 }}>
                  Track your hours easily.
                </div>
              </div>
              <button
                className="btn btn--ghost-onDark btn--sm"
                type="button"
                aria-label="New Entry"
                onClick={() => {
                  setShowEntryPanel(true);
                  setSelectedDateISO(toISO(new Date()));
                }}
              >
                New Entry
              </button>
            </div>
            <div className="card--body">
              <div className="grid grid--cols-5" role="list">
                {stats.map((s, idx) => (
                  <div key={idx} className="stat-pill" role="listitem" aria-label={s.label}>
                    <span aria-hidden="true" style={{ fontSize: 16, color: 'var(--primary)' }}>
                      {s.icon}
                    </span>
                    <div>
                      <div className="stat-pill__label">{s.label}</div>
                      <div className="stat-pill__value">{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Main split: calendar + new entry panel */}
          <div className="main-split">
            {/* Calendar module */}
            <section className="calendar" aria-label="Timesheet Calendar">
              <div className="calendar__header">
                <div className="tabs" role="tablist" aria-label="Calendar View">
                  <button
                    className={`tab ${calendarView === 'week' ? 'tab--active' : ''}`}
                    role="tab"
                    aria-selected={calendarView === 'week'}
                    type="button"
                    onClick={() => setCalendarView('week')}
                  >
                    Week
                  </button>
                  <button
                    className={`tab ${calendarView === 'month' ? 'tab--active' : ''}`}
                    role="tab"
                    aria-selected={calendarView === 'month'}
                    type="button"
                    onClick={() => setCalendarView('month')}
                  >
                    Month
                  </button>
                </div>
                <div className="cluster" style={{ gap: 8 }}>
                  <div style={{ color: 'var(--on-dark)', fontSize: 12, fontWeight: 600 }} aria-live="polite">
                    {calendarTitle}
                  </div>
                  <button className="btn btn--ghost-onDark btn--sm" type="button" onClick={onClickToday}>
                    Today
                  </button>
                </div>
              </div>

              <div className="calendar__grid">
                <div className="calendar__weekdays" role="row">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
                    <div key={w} className="calendar__weekday" role="columnheader">
                      {w}
                    </div>
                  ))}
                </div>

                {/* Week view cells */}
                {calendarView === 'week' && (
                  <div className="calendar__cells" role="row">
                    {weekDates.map((d) => {
                      const iso = toISO(d);
                      const isSelected = iso === selectedDateISO;
                      // show daily aggregated hours if any
                      const day = getDayState(iso);
                      const sessionsTotal = (day.sessions || []).reduce((acc, s) => acc + Math.max(0, Math.floor((s.end - s.start) / 1000)), 0);
                      const totalHrs = Math.floor(sessionsTotal / 3600);
                      return (
                        <div
                          key={iso}
                          className={`calendar__cell ${isSelected ? 'calendar__cell--current' : ''}`}
                          role="gridcell"
                          aria-label={`${d.toDateString()} total hours`}
                          onClick={() => onClickDay(d)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="calendar__cell-inner">
                            <div className="calendar__cell-label">
                              <div className="calendar__cell-hours">{totalHrs}h</div>
                              <div className="calendar__cell-sub">
                                {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Month view grid (6x7) */}
                {calendarView === 'month' && (
                  <div className="calendar__cells" role="row" style={{ gridAutoRows: 'minmax(56px, 1fr)' }}>
                    {monthGridDates.map((d) => {
                      const iso = toISO(d);
                      const isSelected = iso === selectedDateISO;
                      const isOutsideMonth = d < monthFirst || d > monthLast;
                      const day = getDayState(iso);
                      const sessionsTotal = (day.sessions || []).reduce((acc, s) => acc + Math.max(0, Math.floor((s.end - s.start) / 1000)), 0);
                      const totalHrs = Math.floor(sessionsTotal / 3600);
                      return (
                        <div
                          key={iso}
                          className={`calendar__cell ${isSelected ? 'calendar__cell--current' : ''}`}
                          role="gridcell"
                          aria-label={`${d.toDateString()} total hours`}
                          onClick={() => onClickDay(d)}
                          style={{
                            cursor: 'pointer',
                            background: isOutsideMonth ? 'var(--surface-soft)' : undefined,
                            opacity: isOutsideMonth ? 0.6 : 1,
                          }}
                        >
                          <div
                            className="calendar__cell-inner"
                            style={{ alignItems: 'flex-start', justifyContent: 'flex-start', padding: 6 }}
                          >
                            <div className="calendar__cell-label" style={{ textAlign: 'left' }}>
                              <div className="calendar__cell-sub" style={{ fontWeight: 700 }}>
                                {d.getDate()}
                              </div>
                              <div className="calendar__cell-hours" style={{ fontSize: 14, fontWeight: 700 }}>
                                {totalHrs}h
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ height: 12 }} />
              </div>
            </section>

            {/* Right panel - New Entry with tabs for Work and Leave */}
            {showEntryPanel && (
              <aside className="card" aria-label="New Entry Panel" style={{ background: 'var(--surface)', position: 'relative' }}>
                <div className="card--header-dark" style={{ justifyContent: 'space-between' }}>
                  {/* Left: Tabs now first in DOM for keyboard order */}
                  <div className="tabs" role="tablist" aria-label="Entry Type">
                    <button
                      className={`tab ${entryMode === 'work' ? 'tab--active' : ''}`}
                      role="tab"
                      aria-selected={entryMode === 'work'}
                      type="button"
                      onClick={() => setEntryMode('work')}
                    >
                      Work Entry
                    </button>
                    <button
                      className={`tab ${entryMode === 'leave' ? 'tab--active' : ''}`}
                      role="tab"
                      aria-selected={entryMode === 'leave'}
                      type="button"
                      onClick={() => setEntryMode('leave')}
                    >
                      Leave Request
                    </button>
                  </div>
                  {/* Right: Title + Close now moved to right side visually */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>New Entry</div>
                    <button
                      type="button"
                      aria-label="Close New Entry"
                      onClick={onClosePanel}
                      className="btn btn--ghost-onDark btn--sm"
                      style={{ height: 28 }}
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="card--body" style={{ background: 'var(--surface)' }}>
                  {/* Shared Date Display */}
                  <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                    <div className="label" id="entry-date-label">Entry Date</div>
                    <div
                      role="text"
                      aria-labelledby="entry-date-label"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--surface-soft)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 12px',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--text-strong)' }}>
                        {formatDateReadable(selectedDateISO)}
                      </span>
                      <input
                        aria-label="Select date for this entry"
                        type="date"
                        className="input"
                        value={selectedDateISO}
                        onChange={onDateChange}
                        style={{ width: 150, height: 30 }}
                        required
                      />
                    </div>
                    {(entryMode === 'work' ? workErrors.date : leaveErrors.date) ? (
                      <div className="helper" role="alert" style={{ color: 'var(--error)' }}>
                        {entryMode === 'work' ? workErrors.date : leaveErrors.date}
                      </div>
                    ) : (
                      <div className="helper">Choose the day this entry applies to. Defaults to today.</div>
                    )}
                  </div>

                  {entryMode === 'work' ? (
                    <form className="grid" style={{ gap: 12 }} onSubmit={onSubmitWork} noValidate aria-label="Work Entry Form">
                      <label className="label" htmlFor="project">Project</label>
                      <select id="project" className="select" value={project} onChange={(e) => setProject(e.target.value)}>
                        <option value="" disabled>Select project</option>
                        <option value="chronose">Chronose</option>
                      </select>

                      <label className="label" htmlFor="task">Task</label>
                      <select id="task" className="select" value={task} onChange={(e) => setTask(e.target.value)}>
                        <option value="" disabled>Select task</option>
                        <option value="planning">Planning</option>
                        <option value="testing">Testing</option>
                        <option value="meetings">Meetings</option>
                      </select>

                      {/* Hours worked numeric input */}
                      <label className="label" htmlFor="hours">Hours Worked</label>
                      <input
                        id="hours"
                        className="input"
                        type="number"
                        inputMode="decimal"
                        placeholder="e.g., 7.5"
                        min="0"
                        max="24"
                        step="0.25"
                        value={hours}
                        onChange={onHoursChange}
                        required
                        aria-describedby="hours-help"
                      />
                      {workErrors.hours ? (
                        <div id="hours-help" className="helper" role="alert" style={{ color: 'var(--error)' }}>
                          {workErrors.hours}
                        </div>
                      ) : (
                        <div id="hours-help" className="helper">
                          Enter hours as a decimal. Example: 7.5 for 7 hours 30 minutes. Min 0, Max 24.
                        </div>
                      )}

                      <label className="label" htmlFor="notes">Notes</label>
                      <textarea
                        id="notes"
                        className="textarea"
                        placeholder="Optional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />

                      <span className="helper">Estimated 40h/week. Calculated automatically.</span>

                      <div className="new-entry__footer">
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button className="btn btn--outline" type="button" style={{ height: 36 }} onClick={onSaveDraft}>
                            Save as Draft
                          </button>
                          <button
                            className="btn btn--outline"
                            type="button"
                            style={{ height: 36, color: 'var(--text-secondary)' }}
                            onClick={onClear}
                          >
                            Clear
                          </button>
                          {workErrors.submit && (
                            <span role="alert" className="helper" style={{ color: 'var(--error)' }}>
                              {workErrors.submit}
                            </span>
                          )}
                        </div>
                        <button className="btn btn--primary" type="submit">{editingId ? 'Update' : 'Submit'}</button>
                      </div>
                    </form>
                  ) : (
                    // Leave Request Form
                    <form className="grid" style={{ gap: 12 }} onSubmit={onSubmitLeave} noValidate aria-label="Leave Request Form">
                      {/* Leave Type */}
                      <label className="label" htmlFor="leave-type">Leave Type</label>
                      <select
                        id="leave-type"
                        className="select"
                        value={leaveType}
                        onChange={(e) => { setLeaveType(e.target.value); setLeaveErrors((p)=>({ ...p, leaveType: '' })); }}
                        required
                      >
                        <option value="casual">Casual</option>
                        <option value="sick">Sick</option>
                        <option value="vacation">Vacation</option>
                      </select>
                      {leaveErrors.leaveType ? (
                        <div className="helper" role="alert" style={{ color: 'var(--error)' }}>{leaveErrors.leaveType}</div>
                      ) : (
                        <div className="helper">Choose the leave category.</div>
                      )}

                      {/* Duration */}
                      <label className="label" htmlFor="leave-duration">Duration</label>
                      <select
                        id="leave-duration"
                        className="select"
                        value={leaveDuration}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLeaveDuration(v);
                          setLeaveErrors((p)=>({ ...p, leaveDuration: '', leaveHours: '' }));
                          if (v === 'full') setLeaveHours('');
                        }}
                        required
                      >
                        <option value="full">Full day</option>
                        <option value="partial">Partial day</option>
                      </select>
                      {leaveErrors.leaveDuration ? (
                        <div className="helper" role="alert" style={{ color: 'var(--error)' }}>{leaveErrors.leaveDuration}</div>
                      ) : (
                        <div className="helper">Select full day or partial day leave.</div>
                      )}

                      {/* Partial hours field (conditional) */}
                      {leaveDuration === 'partial' && (
                        <>
                          <label className="label" htmlFor="leave-hours">Hours</label>
                          <input
                            id="leave-hours"
                            className="input"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={LEAVE_MAX_HOURS}
                            step="0.25"
                            placeholder={`0–${LEAVE_MAX_HOURS}`}
                            value={leaveHours}
                            onChange={(e) => { setLeaveHours(e.target.value); setLeaveErrors((p)=>({ ...p, leaveHours: '' })); }}
                            required={leaveDuration === 'partial'}
                            aria-describedby="leave-hours-help"
                          />
                          {leaveErrors.leaveHours ? (
                            <div id="leave-hours-help" className="helper" role="alert" style={{ color: 'var(--error)' }}>
                              {leaveErrors.leaveHours}
                            </div>
                          ) : (
                            <div id="leave-hours-help" className="helper">Enter hours between 0 and {LEAVE_MAX_HOURS}.</div>
                          )}
                        </>
                      )}

                      {/* Reason with char count and validation */}
                      <label className="label" htmlFor="leave-reason">Reason</label>
                      <textarea
                        id="leave-reason"
                        className="textarea"
                        placeholder="Describe the reason for your leave…"
                        value={leaveReason}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v.length <= 300) setLeaveReason(v);
                          setLeaveErrors((p)=>({ ...p, leaveReason: '' }));
                        }}
                        required
                        aria-describedby="leave-reason-help"
                      />
                      <div id="leave-reason-help" className="helper" aria-live="polite">
                        {leaveErrors.leaveReason ? (
                          <span role="alert" style={{ color: 'var(--error)' }}>{leaveErrors.leaveReason}</span>
                        ) : (
                          <>
                            Reason is required. <span>{leaveReason.length}</span>/300 characters.
                          </>
                        )}
                      </div>

                      <div className="new-entry__footer">
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn--outline" type="button" style={{ height: 36 }} onClick={onSaveDraft}>
                            Save as Draft
                          </button>
                          <button
                            className="btn btn--outline"
                            type="button"
                            style={{ height: 36, color: 'var(--text-secondary)' }}
                            onClick={onClear}
                          >
                            Clear
                          </button>
                        </div>
                        <button className="btn btn--primary" type="submit">Submit</button>
                      </div>
                    </form>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: { bg: 'var(--surface-soft)', color: 'var(--text-secondary)', border: 'var(--border)', label: 'Draft' },
    approved: { bg: '#E8F5EE', color: '#2A8C58', border: 'rgba(42,140,88,0.25)', label: 'Approved' },
    rejected: { bg: '#FCEDEA', color: '#C84C3D', border: 'rgba(200,76,61,0.25)', label: 'Rejected' },
    pending: { bg: 'var(--accent-warn-tint)', color: 'var(--accent-warn)', border: 'rgba(185,133,0,0.25)', label: 'Pending' },
  };
  const s = map[status] || map.draft;
  return (
    <span
      style={{
        justifySelf: 'start',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: '999px',
        padding: '4px 8px',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
}

const timerStyles = {
  container: {
    display: 'grid',
    gridAutoFlow: 'column',
    alignItems: 'center',
    gap: 8,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '6px 8px',
    boxShadow: 'var(--shadow-sm)',
  },
  time: {
    fontFamily: 'monospace',
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--text-strong)',
    minWidth: 88, // space for 00:00:00
    textAlign: 'center',
  },
  actions: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  last: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    paddingLeft: 4,
  },
};

const toastStyles = {
  banner: {
    position: 'sticky',
    top: 0,
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 12px',
    margin: '8px 24px',
    background: 'var(--warn-tint)',
    border: '1px solid var(--warn)',
    borderRadius: 10,
    color: 'var(--text-strong)',
    boxShadow: 'var(--shadow-sm)',
  },
};

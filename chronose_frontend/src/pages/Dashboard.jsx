import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Employee Dashboard (Timesheet + Status)
 * UI/UX updates:
 * - Adds a "Status" tab next to the "Timesheet" tab in the header (simple view routing via local state).
 * - Removes the Time Type selector.
 * - Adds a live timer widget with Check In/Check Out and shows last session duration.
 * - Adds a Role dropdown set to "Employee" (disabled for now).
 * - Keeps everything frontend-only; no backend wiring.
 * - New Entry form: adds tabs for Work Entry and Leave Request with validation and Ocean Professional styling.
 */

// PUBLIC_INTERFACE
export default function Dashboard() {
  const { user, signOut } = useAuth();

  // Header tabs: 'timesheet' | 'status'
  const [activeTab, setActiveTab] = useState('timesheet');

  // Timer state (in-memory only)
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds for current session
  const [lastSession, setLastSession] = useState(0); // seconds for last completed session
  const tickRef = useRef(null);

  // Role dropdown (disabled for now; default Employee)
  const [role] = useState('employee');

  // Shared date context for both Work Entry and Leave Request
  const todayISO = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  const [entryDate, setEntryDate] = useState(todayISO);

  // Work Entry local state
  const [hours, setHours] = useState(''); // string for input control
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

  // Timer effect
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

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Logout failed', e);
    }
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

  const handleCheckIn = () => {
    if (!isRunning) {
      setElapsed(0);
      setIsRunning(true);
    }
  };

  const handleCheckOut = () => {
    if (isRunning) {
      setIsRunning(false);
      setLastSession(elapsed);
      setElapsed(0);
    }
  };

  // Helpers
  const formatDateReadable = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
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

  const onDateChange = (e) => {
    setEntryDate(e.target.value || todayISO);
    setWorkErrors((prev) => ({ ...prev, date: '' }));
    setLeaveErrors((prev) => ({ ...prev, date: '' }));
  };

  const onClear = () => {
    setProject('');
    setTask('');
    setNotes('');
    setHours('');
    setEntryDate(todayISO);
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

  const onSaveDraft = () => {
    // eslint-disable-next-line no-console
    if (entryMode === 'work') {
      console.log('Draft saved (work, local only):', {
        project, task, notes, hours: hours === '' ? null : Number(hours), date: entryDate,
      });
    } else {
      console.log('Draft saved (leave, local only):', {
        date: entryDate,
        leaveType,
        leaveDuration,
        leaveHours: leaveDuration === 'partial' ? Number(leaveHours || 0) : LEAVE_MAX_HOURS,
        leaveReason,
      });
    }
  };

  const onSubmitWork = (e) => {
    e.preventDefault();
    const hourErr = validateHours(hours);
    const dateErr = entryDate ? '' : 'Please select a date.';
    const nextErrors = { hours: hourErr, date: dateErr };
    setWorkErrors(nextErrors);
    if (hourErr || dateErr) return;

    const payload = {
      project,
      task,
      notes,
      hours: Number(hours),
      date: entryDate,
    };
    // eslint-disable-next-line no-console
    console.log('Submitting work entry (frontend only):', payload);
  };

  // PUBLIC_INTERFACE
  const validateLeave = () => {
    /** Validate leave request fields; returns object with errors. */
    const errs = {
      date: '',
      leaveType: '',
      leaveDuration: '',
      leaveReason: '',
      leaveHours: '',
    };
    if (!entryDate) errs.date = 'Please select a date.';
    if (!leaveType) errs.leaveType = 'Please select a leave type.';
    if (!leaveDuration) errs.leaveDuration = 'Please select a duration.';

    // Duration selected -> reason required
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

  const onSubmitLeave = (e) => {
    e.preventDefault();
    const errs = validateLeave();
    setLeaveErrors(errs);
    const hasErr = Object.values(errs).some(Boolean);
    if (hasErr) return;

    const payload = {
      date: entryDate,
      leaveType,
      leaveDuration,
      leaveHours: leaveDuration === 'partial' ? Number(leaveHours || 0) : LEAVE_MAX_HOURS,
      leaveReason: leaveReason.trim(),
    };
    // eslint-disable-next-line no-console
    console.log('Submitting leave request (frontend only):', payload);
  };

  // Status tab placeholder content
  const StatusView = (
    <div className="page">
      <section className="card" aria-label="Status Overview">
        <div className="card--header-dark">
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.2px', color: 'var(--on-dark)' }}>
            Status
          </div>
          <div style={{ fontSize: 12, color: 'var(--on-dark-muted)' }}>Overview and activity feed (placeholder)</div>
        </div>
        <div className="card--body">
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            This is a placeholder for the Status view. Future: submission state, pending approvals, reminders, etc.
          </p>
        </div>
      </section>
    </div>
  );

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
          <label
            style={{ fontSize: 13, color: 'var(--text-secondary)' }}
            htmlFor="role"
          >
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
            {lastSession > 0 ? (
              <div style={timerStyles.last} aria-label="Last session duration">
                Last: {formatHMS(lastSession)}
              </div>
            ) : null}
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
              <button className="btn btn--ghost-onDark btn--sm" type="button" aria-label="New Entry">New Entry</button>
            </div>
            <div className="card--body">
              <div className="grid grid--cols-5" role="list">
                {stats.map((s, idx) => (
                  <div key={idx} className="stat-pill" role="listitem" aria-label={s.label}>
                    <span aria-hidden="true" style={{ fontSize: 16, color: 'var(--primary)' }}>{s.icon}</span>
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
                  <button className="tab tab--active" role="tab" aria-selected="true" type="button">Week View</button>
                  <button className="tab" role="tab" aria-selected="false" type="button">Month View</button>
                </div>
                <button className="btn btn--ghost-onDark btn--sm" type="button">Today</button>
              </div>
              <div className="calendar__grid">
                <div className="calendar__weekdays" role="row">
                  {weekdays.map((w) => (
                    <div key={w} className="calendar__weekday" role="columnheader">{w}</div>
                  ))}
                </div>
                <div className="calendar__cells" role="row">
                  {weekdays.map((w, i) => (
                    <div
                      key={w}
                      className={`calendar__cell ${i === todayIdx ? 'calendar__cell--current' : ''}`}
                      role="gridcell"
                      aria-label={`${w} total hours`}
                    >
                      <div className="calendar__cell-inner">
                        <div className="calendar__cell-label">
                          <div className="calendar__cell-hours">0h</div>
                          <div className="calendar__cell-sub">Work Log</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 12 }} />
              </div>
            </section>

            {/* Right panel - New Entry with tabs for Work and Leave */}
            <aside className="card" aria-label="New Entry Panel" style={{ background: 'var(--surface)' }}>
              <div className="card--header-dark">
                <div style={{ fontSize: 13, fontWeight: 700 }}>New Entry</div>
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
                      {formatDateReadable(entryDate)}
                    </span>
                    <input
                      aria-label="Select date for this entry"
                      type="date"
                      className="input"
                      value={entryDate}
                      onChange={onDateChange}
                      style={{ width: 150, height: 30 }}
                      required
                    />
                  </div>
                  { (entryMode === 'work' ? workErrors.date : leaveErrors.date) ? (
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
          </div>
        </div>
      )}
    </div>
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

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

            {/* Right panel - New Entry */}
            <aside className="card" aria-label="New Entry Panel" style={{ background: 'var(--surface)' }}>
              <div className="card--header-dark">
                <div style={{ fontSize: 13, fontWeight: 700 }}>New Entry</div>
                <div className="tabs" role="tablist" aria-label="Entry Type">
                  <button className="tab tab--active" role="tab" aria-selected="true" type="button">Work Entry</button>
                  <button className="tab" role="tab" aria-selected="false" type="button">Leave Request</button>
                </div>
              </div>
              <div className="card--body" style={{ background: 'var(--surface)' }}>
                <form className="grid" style={{ gap: 12 }}>
                  <label className="label" htmlFor="project">Project</label>
                  <select id="project" className="select" defaultValue="">
                    <option value="" disabled>Select project</option>
                    <option>Chronose</option>
                  </select>

                  <label className="label" htmlFor="task">Task</label>
                  <select id="task" className="select" defaultValue="">
                    <option value="" disabled>Select task</option>
                    <option>Planning</option>
                    <option>Testing</option>
                    <option>Meetings</option>
                  </select>

                  <label className="label" htmlFor="notes">Notes</label>
                  <textarea id="notes" className="textarea" placeholder="Optional notes..." />

                  <span className="helper">Estimated 40h/week. Calculated automatically.</span>

                  <div className="new-entry__footer">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn--outline" type="button" style={{ height: 36 }}>Save as Draft</button>
                      <button className="btn btn--outline" type="button" style={{ height: 36, color: 'var(--text-secondary)' }}>Clear</button>
                    </div>
                    <button className="btn btn--primary" type="button">Submit</button>
                  </div>
                </form>
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

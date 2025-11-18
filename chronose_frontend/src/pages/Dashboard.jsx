import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Employee Dashboard (Timesheet)
 * Visual refinements to match "Ocean Professional" reference.
 * No data wiring changes here.
 */

// PUBLIC_INTERFACE
export default function Dashboard() {
  const { user, signOut } = useAuth();

  const [timeType, setTimeType] = useState('onsite');
  const timeTypeOptions = useMemo(
    () => [
      { label: 'On Site', value: 'onsite' },
      { label: 'Remote', value: 'remote' },
      { label: 'Hybrid', value: 'hybrid' },
    ],
    []
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

  return (
    <div>
      {/* Top utility bar */}
      <div className="headerbar">
        <div className="cluster" aria-label="Section indicators">
          <span className="chip chip--filled-primary" aria-current="page">Timesheet</span>
          <span className="chip chip--tint-warn">Updated Just</span>
        </div>
        <div className="cluster">
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Time Type:</label>
          <select
            className="select"
            aria-label="Time Type"
            value={timeType}
            onChange={(e) => setTimeType(e.target.value)}
          >
            {timeTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className="btn btn--primary" type="button">Check In</button>
          <div style={{ width: 12 }} />
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

      {/* Page container */}
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
    </div>
  );
}

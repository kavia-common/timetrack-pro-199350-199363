import React from 'react';
import './App.css';

// Dummy placeholders for now
function HeaderBar() {
  return (
    <header className="header">
      <div className="header__left">
        <span className="chip chip--filled">Timesheet</span>
        <span className="chip chip--warn-tint">Updated Just</span>
      </div>
      <div className="header__right">
        <label htmlFor="timeType" className="header__label">
          Time Type:
        </label>
        <select id="timeType" className="select">
          <option>On Site</option>
        </select>
        <button className="btn btn--primary header__checkin">Check In</button>
      </div>
    </header>
  );
}

function App() {
  return (
    <div className="page">
      <HeaderBar />
      <main className="main">
        <section className="card summary-card">
          <div className="card--header-dark">
            <div>
              <div className="title">Timesheet Logger</div>
              <div className="subtitle">Track your hours easily.</div>
            </div>
            <button className="btn btn--ghost btn--on-dark">New Entry</button>
          </div>
          <div className="card--body grid grid--cols-5">
            {['Total Hours', 'Working Days', 'Avg Hours/Day', 'Overtime', 'Leaves Taken'].map((label) => (
              <div key={label} className="stats-pill">
                <div className="stats-label">{label}</div>
                <div className="stats-value">0</div>
              </div>
            ))}
          </div>
        </section>
        <section className="card calendar-card">
          <div className="card--header-dark calendar__header">
            <div className="tabs">
              <span className="tab tab--active">Week View</span>
              <span className="tab">Month View</span>
            </div>
            <button className="btn btn--ghost btn--on-dark tab-btn-today">Today</button>
          </div>
          <div className="calendar__grid">
            <div className="calendar__row calendar__row--labels">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <span key={d} className="calendar__label">{d}</span>
              ))}
            </div>
            <div className="calendar__row">
              {Array(7).fill(null).map((_, i) => (
                <div key={i} className={`calendar__cell${i === 0 ? ' calendar__cell--current' : ''}`}>
                  <div className="calendar__cell-value">0h</div>
                  <div className="calendar__cell-subtext">Work Log</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className="card entry-panel">
          <div className="card--header-dark entry-panel__header">
            <div className="entry-panel__title">New Entry</div>
            <div className="tabs entry-panel__tabs">
              <span className="tab tab--active">Work Entry</span>
              <span className="tab">Leave Request</span>
            </div>
          </div>
          <div className="entry-panel__body">
            <div className="form-group">
              <label className="label">Project</label>
              <select className="input"><option>--</option></select>
            </div>
            <div className="form-group">
              <label className="label">Task</label>
              <select className="input"><option>--</option></select>
            </div>
            <div className="form-group">
              <label className="label">Type</label>
              <div>
                <input type="radio" id="type-in" name="type" defaultChecked />
                <label htmlFor="type-in">In</label>
                <input type="radio" id="type-out" name="type" />
                <label htmlFor="type-out">Out</label>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Notes</label>
              <textarea className="input" rows={3}></textarea>
            </div>
            <div className="form-group">
              <label className="label">Hours</label>
              <input className="input" type="number" />
            </div>
          </div>
          <div className="entry-panel__actions">
            <button className="btn btn--ghost">Save as Draft</button>
            <button className="btn btn--outline">Clear</button>
            <button className="btn btn--primary">Submit</button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import './App.css';

/**
 * Legacy App component retained for test compatibility.
 * Not used as the main entry anymore (routing moved to index.js).
 */

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <div className="App">
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <p>Chronose Frontend</p>
        <p>Current theme: <strong>{theme}</strong></p>
      </header>
    </div>
  );
}

export default App;

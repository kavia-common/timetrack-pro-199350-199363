import React from "react";

/**
 * Minimal App component, will show placeholder and confirm that app boots correctly.
 */
// PUBLIC_INTERFACE
function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#1A1A1A",
      color: "#E87A41",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "sans-serif"
    }}>
      <h1>Chronose Time Tracker</h1>
      <p>🚧 React frontend initialized successfully. Ready for development.</p>
    </div>
  );
}

export default App;

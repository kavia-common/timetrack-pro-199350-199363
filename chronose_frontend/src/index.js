import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

/**
 * React 18 root rendering logic, compatible for Create React App foundation
 */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

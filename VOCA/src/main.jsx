import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { localStore } from "./lib/localStore.js";

// App.jsx was written against the Claude.ai artifact's `window.storage`
// API. Polyfilling it here with a real IndexedDB-backed implementation
// means the UI code needed zero changes to become a real, persistent app.
if (typeof window !== "undefined") {
  window.storage = localStore;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// MSW DISABLED - Using real backend at http://localhost:5000
// import { startMSW } from "./mocks/browser";

// Register service worker for PWA (caching + push notifications)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// MSW DISABLED - Using real backend at http://localhost:5000
// import { startMSW } from "./mocks/browser";

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from "react-dom/client";
import App from "./root";

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

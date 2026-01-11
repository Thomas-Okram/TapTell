import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AdminAuthProvider } from "./lib/adminAuth";
import { ToastProvider } from "./components/ui/Toasts";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

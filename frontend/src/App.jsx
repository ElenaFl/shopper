import React from "react";
import { StrictMode } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./components/ui/Header/Header.jsx";
import { Footer } from "./components/ui/Footer/Footer.jsx";
import { SavedDrawer } from "./components/ui/SavedDrawer/SavedDrawer.jsx";
import { ChatWidget } from "./components/ui/ChatWidget/ChatWidget.jsx";
import "./index.css";
import { useAuth } from "./context/auth/useAuth";
import ScrollToTop from "./components/ui/ScrollToTop/ScrollToTop.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";

const App = () => {
  const { user, checking } = useAuth();

  return (
    <StrictMode>
      <Header />
      <main>
        <Outlet />
        <ScrollToTop />
      </main>
      <Footer />
      <SavedDrawer apiBase={API_BASE} />
      {!checking && user && !user.is_admin && <ChatWidget />}
    </StrictMode>
  );
};

export default App;

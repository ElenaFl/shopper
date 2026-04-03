import React from "react";
import { StrictMode } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./components/ui/Header/Header.jsx";
import { Footer } from "./components/ui/Footer/Footer.jsx";
import { SavedDrawer } from "./components/ui/SavedDrawer/SavedDrawer.jsx";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";

const App = () => (
  <StrictMode>
    <Header />
    <main>
      <Outlet />
    </main>
    <Footer />
    <SavedDrawer apiBase={API_BASE} />
  </StrictMode>
);

export default App;

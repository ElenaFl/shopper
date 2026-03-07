import React from "react";
import { StrictMode } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./components/ui/Header/Header.jsx";
import { Footer } from "./components/ui/Footer/Footer.jsx";
import "./index.css";

const App = () => (
  <StrictMode>
    <Header />
    <main>
      <Outlet />
    </main>
    <Footer />
  </StrictMode>
);

export default App;

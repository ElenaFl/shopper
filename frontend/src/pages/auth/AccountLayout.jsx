import React from "react";
import { NavLink, Outlet } from "react-router-dom";

/**
 * AccountLayout — layout для личного кабинета.
 * Содержит <Outlet /> для рендеринга дочерних страниц (dashboard, orders и т.д.).
 */
export const AccountLayout = () => {
  return (
    <div className="w-full mt-55">
      <h1 className="mb-16 text-[33px] font-medium text-center">My Account</h1>
      <nav className="mb-16 border-b border-[#D8D8D8]">
        <ul className="flex text-xl gap-12">
          <li>
            <NavLink
              to=""
              end
              className={({ isActive }) =>
                `block px-3 pt-2 pb-8 ${isActive ? "border-b border-black" : "border-b border-transparent"}`
              }
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="orders"
              className={({ isActive }) =>
                `block px-3 pt-2 pb-8 ${isActive ? "border-b border-black" : "border-b border-transparent"}`
              }
            >
              Orders
            </NavLink>
          </li>
          <li>
            <NavLink
              to="downloads"
              className={({ isActive }) =>
                `block px-3 pt-2 pb-8 ${isActive ? "border-b border-black" : "border-b border-transparent"}`
              }
            >
              Downloads
            </NavLink>
          </li>
          <li>
            <NavLink
              to="addresses"
              className={({ isActive }) =>
                `block px-3 pt-2 pb-8 ${isActive ? "border-b border-black" : "border-b border-transparent"}`
              }
            >
              Addresses
            </NavLink>
          </li>
          <li>
            <NavLink
              to="details"
              className={({ isActive }) =>
                `block px-3 pt-2 pb-8 ${isActive ? "border-b border-black" : "border-b border-transparent"}`
              }
            >
              Account details
            </NavLink>
          </li>
          <li>
            <NavLink
              to="logout"
              className={({ isActive }) =>
                `block px-3 pt-2 pb-8 ${isActive ? "border-b border-black" : "border-b border-transparent"}`
              }
            >
              Logout
            </NavLink>
          </li>
        </ul>
      </nav>
      <div>
        {/* Основной контент — сюда вставляются дочерние маршруты */}
        <main className="">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

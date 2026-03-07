import React from "react";
import { NavLink, Link, Outlet } from "react-router-dom";

export const AccountDashboard = () => {
  return (
    <div className="mb-51">
      <div className="mb-4">
        <span className="mb-4">
          Hello Vitatheme (not Vitatheme?
          <NavLink to="logout" className="text-[#A18A68]">
            Log out
          </NavLink>
          )
        </span>
      </div>
      <nav>
        <span>
          From your account dashboard you can view your{" "}
          <NavLink to="logout" className="text-[#A18A68]">
            recent orders
          </NavLink>
          , manage your <NavLink to="orders" className="text-[#A18A68]">Lshipping and billing addresses</NavLink>{" "}
          , and edit your <NavLink to="details" className="text-[#A18A68]">password and account details</NavLink>
          .
        </span>
      </nav>
    </div>
  );
};

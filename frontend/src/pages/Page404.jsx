import React from "react";
import { NavLink } from "react-router-dom";

export const Page404 = () => {
  return (
    <div className="pt-95 pb-62 m-auto flex flex-col items-center">
      <h1 className="mb-6 text-3xl">404 ERROR</h1>
      <p className="text-xl text-center mb-15">
        This page not found;
        <br />
        back to home and start again
      </p>
      <NavLink
        to="/"
        className="py-4 px-12 border rounded-sm hover:bg-black hover:text-white"
      >
        HOMEPAGE
      </NavLink>
    </div>
  );
};

export default Page404;

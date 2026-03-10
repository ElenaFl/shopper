import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs } from "../../components/ui/Tabs/Tabs.jsx";

export const Account = () => {
  const [activeCategory, setActiveCategory] = useState("Sign in");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const getCsrf = async (backendHost = "http://myshopper.local") => {
    await fetch(`${backendHost}/sanctum/csrf-cookie`, {
      method: "GET",
      credentials: "include",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;

    try {
      await getCsrf();

      const res = await fetch("http://myshopper.local/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Login failed");
      }

      const data = await res.json();
      console.log("Logged in:", data);
      // Example: redirect to profile page
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReg = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.target;
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    const password_confirmation = form.confirmPassword.value;

    try {
      await getCsrf();

      const res = await fetch("http://myshopper.local/api/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, password_confirmation }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.errors) {
          const first = Object.values(data.errors)[0];
          throw new Error(Array.isArray(first) ? first[0] : first);
        }
        throw new Error(data.message || "Registration failed");
      }

      const data = await res.json();
      console.log("Registered:", data);
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-62 max-w-125 mx-auto mb-72">
      <h1 className="text-[33px] font-medium text-center mb-16">My account</h1>
      <div className=" w-full p-1 bg-[#EFEFEF] mb-12 rounded-sm">
        <Tabs
          categories={["Sign in", "Register"]}
          activeCategory={activeCategory}
          onCategoryChange={(category) => setActiveCategory(category)}
          tabClassName="flex w-full bg-[#EFEFEF] p-1 rounded-sm"
          tabItemClassName="flex-1 text-center py-4 font-medium rounded-sm"
          activeClassName="bg-white text-black"
          inactiveClassName="bg-transparent text-[#707070]"
        />
      </div>

      {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
      {loading && <div className="mb-4 text-center">Loading...</div>}

      {activeCategory === "Sign in" && (
        <div className="text-[#707070]" id="sign-content">
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              className="w-full pb-3 border-b border-[#D8D8D8] mb-12"
              placeholder="Email*"
              required
            />
            <input
              type="password"
              name="password"
              className="w-full pb-3 border-b border-[#D8D8D8] mb-4"
              placeholder="Password*"
              required
            />
            <div className="w-[27%] flex items-center justify-between gap-x-2 mb-30">
              <input type="checkbox" id="rememberMe" className="w-4 h-4" />
              <label htmlFor="rememberMe">Remember me</label>
            </div>
            <button
              type="submit"
              className="block w-full text-center mb-3 mx-auto py-4 font-bold border rounded-sm  cursor-pointer bg-black text-white hover:bg-white hover:text-black"
            >
              Sign in
            </button>

            <Link
              to="#"
              className="block w-full py-4 px-10 text-center hover:border rounded-sm  cursor-pointer bg-white text-black"
            >
              Have you forgotten your password?
            </Link>
          </form>
        </div>
      )}

      {activeCategory === "Register" && (
        <form onSubmit={handleSubmitReg}>
          <div className="text-[#707070]" id="additional-information">
            <input
              type="text"
              name="name"
              className="w-full pb-3 border-b border-[#D8D8D8] mb-12"
              placeholder="Name*"
              required
            />
            <input
              type="email"
              name="email"
              className="w-full pb-3 border-b border-[#D8D8D8] mb-12"
              placeholder="Email*"
              required
            />
            <input
              type="password"
              name="password"
              className="w-full pb-3 border-b border-[#D8D8D8] mb-12"
              placeholder="Password*"
              required
            />
            <input
              type="password"
              name="confirmPassword"
              className="w-full pb-3 border-b border-[#D8D8D8] mb-4"
              placeholder="Confirm password*"
              required
            />
            <div className="w-[32%] flex items-center justify-between gap-x-2 mb-4">
              <input type="checkbox" id="registerMe" className="w-4 h-4" />
              <label htmlFor="registerMe">I agree to Terms</label>
            </div>
            <button
              type="submit"
              className="block w-full text-center mb-3 mx-auto py-4 font-bold border rounded-sm  cursor-pointer bg-black text-white hover:bg-white hover:text-black"
            >
              Register
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

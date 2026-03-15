import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Tabs } from "../../components/ui/Tabs/Tabs.jsx";
import { Select } from "../../components/ui/Select/Select.jsx";
import { Button } from "../../components/ui/Button/Button.jsx";
import { useAuth } from "../../context/auth/useAuth.js";

/**
 * Компонент Account - UI для входа и регистрации со вкладками (Tabs).
 *
 * 1. Делает POST /api/login и /api/register на бекенд (Laravel) с включёнными cookie (credentials: "include") и CSRF-токеном
 * 2. После успешного ответа обновляет контекст пользователя через fetchUser() и показывает приветствие.
 */

export const Account = () => {
  // 1. Tabs вкладка активна ("Sign in" / "Register")
  const [activeCategory, setActiveCategory] = useState("Sign in");
  // 2. Tabs вкладка активна ("Dashboard"...)
  const [activeDashboard, setActiveDashboard] = useState("Dashboard");
  // индикатор выполнения запроса
  const [loading, setLoading] = useState(false);
  // общее текстовое сообщение ошибки (показано сверху)
  const [error, setError] = useState(null);
  // объект полевых ошибок (из Laravel validation: errors → { field: [msg] })
  const [formErrors, setFormErrors] = useState({});

  // ф-я для перехода по ссылкам
  const navigate = useNavigate();

  // получаем API из контекста
  const { getCsrf, fetchUser, BACKEND, user, setUser, logout } = useAuth();

  // ф-я очистки поля с текстом ошибки
  const clearErrorOnInput = (e) => {
    const name = e.target.name;
    setError(null);
    if (formErrors && formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // вспомогательная функция; берёт cookie по имени (используется для XSRF-TOKEN)
  const getCookie = (name) => {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)"),
    );
    return match ? decodeURIComponent(match[2]) : null;
  };

  // валидация на клиенте
  const isValidName = (name) => {
    if (!name) return false;
    const trimmed = name.trim();
    return /^[A-Za-zА-Яа-яЁё\s]{2,}$/.test(trimmed);
  };

  const isValidEmail = (email) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPassword = (password) => {
    return typeof password === "string" && password.length >= 6;
  };

  // вспомогательная функция для обработки ошибок ответа сервера (формат Laravel)
  const handleResponseErrors = async (res) => {
    const data = await res.json().catch(() => ({}));
    if (data.errors && typeof data.errors === "object") {
      const flat = {};
      Object.entries(data.errors).forEach(([k, v]) => {
        flat[k] = Array.isArray(v) ? v[0] : String(v);
      });
      setFormErrors(flat);
      setError(
        flat[Object.keys(flat)[0]] || data.message || "Validation error",
      );
      return true;
    }
    if (data.message) {
      setError(data.message);
      return true;
    }
    return false;
  };

  // логика входа
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFormErrors({});

    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password should be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await getCsrf();
      const res = await fetch(`${BACKEND}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const handled = await handleResponseErrors(res);
        if (handled) return;
        throw new Error("Login failed");
      }

      const serverUser = await fetchUser();
      if (serverUser) {
        setUser(serverUser);
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Login error");
    } finally {
      setLoading(false);
    }
  };

  // регистрация
  const handleSubmitReg = async (e) => {
    e.preventDefault();
    setError(null);
    setFormErrors({});

    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const password_confirmation = form.confirmPassword.value;

    if (!isValidName(name)) {
      setError(
        "Name should be at least 2 letters and contain only letters and spaces.",
      );
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password should be at least 6 characters.");
      return;
    }
    if (password !== password_confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await getCsrf();
      const res = await fetch(`${BACKEND}/api/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
        },
        body: JSON.stringify({ name, email, password, password_confirmation }),
      });

      if (!res.ok) {
        const handled = await handleResponseErrors(res);
        if (handled) return;
        throw new Error("Registration failed");
      }

      const serverUser = await fetchUser();
      if (serverUser) {
        setUser(serverUser);
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-62 mb-72">
      <div className="max-w-125 mx-auto">
        <h1 className="text-[33px] font-medium text-center mb-16">
          My account
        </h1>
      </div>

      {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
      <div className="h-7 mb-4 text-center">
        {loading ? <div>Loading...</div> : null}
      </div>

      {user ? (
        <div className="w-full">
          <Tabs
            categories={[
              "Dashboard",
              "Orders",
              "Downloads",
              "Addresses",
              "Account details",
              "Logout",
            ]}
            activeCategory={activeDashboard}
            onCategoryChange={(category) => setActiveDashboard(category)}
            tabClassName="flex list-none gap-12 justify-start border-b border-[#D8D8D8]"
            tabItemClassName="inline-flex pl-0 items-center justify-center px-4 py-2 text-lg cursor-pointer"
            activeClassName="text-black border-b-2 border-black"
            inactiveClassName="text-gray-500"
          />

          {activeDashboard === "Dashboard" && (
            <div className="mt-10 mb-51">
              <p>
                From your account dashboard you can view your{" "}
                <span className="text-[#A18A68]">recent orders</span>, manage
                your
                <span className="text-[#A18A68]">
                  Lshipping and billing addresses
                </span>
                , and edit your{" "}
                <span className="text-[#A18A68]">
                  password and account details
                </span>
                .
              </p>
            </div>
          )}

          {activeDashboard === "Orders" && (
            <div className="mt-10 mb-50">
              <table className="w-full">
                <thead>
                  <tr className="pb-4 border-b">
                    <th className="pb-4 pr-35 text-left">ORDER NUMBER</th>
                    <th className="pb-4 pr-35 text-left">DATE</th>
                    <th className="pb-4 pr-35 text-left">STATUS</th>
                    <th className="pb-4 pr-35 text-left">TOTAL</th>
                    <th className="pb-4 pr-35 text-left">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#D8D8D8] text-[#707070]">
                    <td className="py-6 text-left">text</td>
                    <td className="py-6 text-left">text</td>
                    <td className="py-6 text-left">text</td>
                    <td className="py-6 text-left">text</td>
                    <td className="py-6 text-left">text</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeDashboard === "Downloads" && (
            <div className="mt-10 mb-50">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-4 pr-35">ORDER NUMBER</th>
                    <th className="pb-4 pr-35">DATE</th>
                    <th className="pb-4 pr-35">STATUS</th>
                    <th className="pb-4 pr-35">TOTAL</th>
                    <th className="pb-4 pr-35">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#D8D8D8] text-[#707070] text-left">
                    <td className="py-6">text</td>
                    <td className="py-6">text</td>
                    <td className="py-6">text</td>
                    <td className="py-6">text</td>
                    <td className="py-6">text</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeDashboard === "Addresses" && (
            <div className="mt-10 mb-50">
              <div className="w-full flex justify-between text-[#707070] mb-62">
                <div className="w-[46%]">
                  <h2 className="text-2xl text-black">Billing Details</h2>
                  <form className="mb-16">
                    <div className="w-full flex justify-between items-center border-b border-[#D8D8D8]">
                      <div className="w-[46%] pt-7 pb-3">
                        <input
                          type="text"
                          name="first"
                          placeholder="First name *"
                        />
                      </div>
                      <div className="w-[46%] pt-7 pb-3">
                        <input
                          type="text"
                          name="last"
                          placeholder="Last name *"
                        />
                      </div>
                    </div>
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input
                        type="text"
                        name="company"
                        placeholder="Company Name"
                      />
                    </div>
                    <Select
                      className="w-full pt-7 pb-3 border-b border-[#D8D8D8] text-[#c6c2c2]  appearance-none"
                      arrowClassName="w-[16px] h-[16px] absolute top-[32px] right-3 pointer-events-none"
                    />
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input
                        type="text"
                        name="street"
                        placeholder="Street Address *"
                      />
                    </div>
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input
                        type="text"
                        name="postCode"
                        placeholder="Postcode / ZIP *"
                      />
                    </div>
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input
                        type="text"
                        name="city"
                        placeholder="Town / City *"
                      />
                    </div>
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input type="text" name="phone" placeholder="Phone *" />
                    </div>
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input type="email" name="email" placeholder="Email *" />
                    </div>
                  </form>
                  <div className="w-1/2">
                    <Button color="black" name="SAVE ADDRESS" />
                  </div>
                </div>

                <div className="w-[46%]">
                  <h2 className="text-2xl text-black pb-7">Shipping Address</h2>
                  <p className="mb-4 font-bold text-[#A18A68]">ADD</p>
                  <p className="text-[Y#707070]">
                    You have not set up this type of address yet.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeDashboard === "Account details" && (
            <div className="mt-10 mb-50">
              <form className="max-w-lg">
                <label className="block mb-4">
                  <span className="text-sm text-gray-700">Full name</span>
                  <input
                    type="text"
                    name="name"
                    className="w-full border-b py-2 mt-2 focus:outline-none"
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="block mb-4">
                  <span className="text-sm text-gray-700">Email</span>
                  <input
                    type="email"
                    name="email"
                    className="w-full border-b py-2 mt-2 focus:outline-none"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="block mb-4">
                  <span className="text-sm text-gray-700">
                    Password (leave blank to keep)
                  </span>
                  <input
                    type="password"
                    name="password"
                    className="w-full border-b py-2 mt-2 focus:outline-none"
                    placeholder="New password"
                    autoComplete="new-password"
                  />
                </label>
                <div className="w-1/2 mt-10 mb-62">
                  <Button type="submit" color="black" name="SAVE ADDRESS" />
                </div>
              </form>
            </div>
          )}

          {activeDashboard === "Logout" && (
            <div className="mt-10 mb-50">
              <p className="inline-block text-xl font-medium mb-4 mr-10">
                <span className="text-[#A18A68]">Log out</span> of your account
              </p>
              <div className="inline-block w-34">
                <Button
                  color="black"
                  name="Confirm logout"
                  onClick={async () => {
                    try {
                      await logout(); // разлогин (AuthProvider.logout) — уже не делает redirect
                      navigate("/", { replace: true }); // внутри SPA — плавный переход на главную
                    } catch (err) {
                      console.error("Logout failed", err);
                      // при необходимости показать ошибку пользователю
                    }
                  }}
                />
              </div>
              {/* <button
                onClick={async () => {
                  try {
                    await logout(); // разлогин (AuthProvider.logout) — уже не делает redirect
                    navigate("/", { replace: true }); // внутри SPA — плавный переход на главную
                  } catch (err) {
                    console.error("Logout failed", err);
                    // при необходимости показать ошибку пользователю
                  }
                }}
                className="inline-block px-4 py-2 border rounded text-white bg-black"
              > */}
              {/* Confirm logout
              </button> */}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-51 max-w-125 mx-auto">
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

          {activeCategory === "Sign in" && (
            <div className="text-[#707070]" id="sign-content">
              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  name="email"
                  className="w-full pb-3 border-b border-[#D8D8D8] mb-12"
                  placeholder="Email*"
                  required
                  onInput={clearErrorOnInput}
                />
                {formErrors.email && (
                  <div className="text-red-500 text-sm mb-4">
                    {formErrors.email}
                  </div>
                )}
                <input
                  type="password"
                  name="password"
                  className="w-full pb-3 border-b border-[#D8D8D8] mb-4"
                  placeholder="Password*"
                  required
                  onInput={clearErrorOnInput}
                />
                {formErrors.password && (
                  <div className="text-red-500 text-sm mb-4">
                    {formErrors.password}
                  </div>
                )}

                <div className="w-[27%] flex items-center justify-between gap-x-2 mb-30">
                  <input type="checkbox" id="rememberMe" className="w-4 h-4" />
                  <label htmlFor="rememberMe">Remember me</label>
                </div>

                <button
                  type="submit"
                  className="block w-full text-center mb-3 mx-auto py-4 font-bold border rounded-sm cursor-pointer bg-black text-white hover:bg-white hover:text-black"
                  disabled={loading}
                >
                  Sign in
                </button>

                <Link
                  to="#"
                  className="block w-full py-4 px-10 text-center hover:border rounded-sm cursor-pointer bg-white text-black"
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
                  onInput={clearErrorOnInput}
                />
                {formErrors.name && (
                  <div className="text-red-500 text-sm mb-4">
                    {formErrors.name}
                  </div>
                )}

                <input
                  type="email"
                  name="email"
                  className="w-full pb-3 border-b border-[#D8D8D8] mb-12"
                  placeholder="Email*"
                  required
                  onInput={clearErrorOnInput}
                />
                {formErrors.email && (
                  <div className="text-red-500 text-sm mb-4">
                    {formErrors.email}
                  </div>
                )}

                <input
                  type="password"
                  name="password"
                  className="w-full pb-3 border-b border-[#D8D8D8] mb-12"
                  placeholder="Password*"
                  required
                  onInput={clearErrorOnInput}
                />
                {formErrors.password && (
                  <div className="text-red-500 text-sm mb-4">
                    {formErrors.password}
                  </div>
                )}

                <input
                  type="password"
                  name="confirmPassword"
                  className="w-full pb-3 border-b border-[#D8D8D8] mb-4"
                  placeholder="Confirm password*"
                  required
                  onInput={clearErrorOnInput}
                />
                {formErrors.password_confirmation && (
                  <div className="text-red-500 text-sm mb-4">
                    {formErrors.password_confirmation}
                  </div>
                )}

                <div className="w-[32%] flex items-center justify-between gap-x-2 mb-4">
                  <input type="checkbox" id="registerMe" className="w-4 h-4" />
                  <label htmlFor="registerMe">I agree to Terms</label>
                </div>

                <button
                  type="submit"
                  className="block w-full text-center mb-3 mx-auto py-4 font-bold border rounded-sm cursor-pointer bg-black text-white hover:bg-white hover:text-black"
                  disabled={loading}
                >
                  Register
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

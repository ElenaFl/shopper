import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs } from "../../components/ui/Tabs/Tabs.jsx";
import { useAuth } from "../../context/auth/useAuth.js";
import { Alert } from "../../components/ui/Alert/Alert.jsx";

/**
 * Компонент Account - UI для входа и регистрации со вкладками (Tabs).
 *
 * 1. Делает POST /api/login и /api/register на бекенд (Laravel) с включёнными cookie (credentials: "include") и CSRF-токеном
 * 2.После успешного ответа обновляет контекст пользователя через fetchUser() и *показывает оповещение.
 */

export const Account = () => {
  //какая вкладка активна ("Sign in" / "Register")
  const [activeCategory, setActiveCategory] = useState("Sign in");
  //индикатор выполнения запроса
  const [loading, setLoading] = useState(false);
  //общее текстовое сообщение ошибки (показано сверху)
  const [error, setError] = useState(null);
  //объект полевых ошибок (из Laravel validation: errors → { field: [msg] })
  const [formErrors, setFormErrors] = useState({});

  // ф-я очиски поля с текстом ошибки
  const clearErrorOnInput = (e) => {
    const name = e.target.name;
    // убрать общее сообщение
    setError(null);
    // удалить полевую ошибку для текущего поля, если есть
    if (formErrors && formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // вспомогательная функция; берёт cookie по имени (используется для XSRF-TOKEN)
  // getCookie("XSRF-TOKEN")
  const getCookie = (name) => {
    // в браузере document.cookie возвращает строку всех доступных (не HttpOnly) cookie в виде "a=1; b=2; c=3" (пары разделяются точкой с запятой и, обычно, пробелом).
    const match = document.cookie.match(
      //поиск coockie с именем XSRF-TOKEN через регулярное выражение
      new RegExp("(^| )" + name + "=([^;]+)"),
    );
    //возврат декодированного значения XSRF-TOKEN или null
    //возвращается "abc 123"
    return match ? decodeURIComponent(match[2]) : null;
  };

  // состояние кастомного Alert для успеха (открыт/закрыт)
  const [alertOpen, setAlertOpen] = useState(false);

  // состояние Alert (содержимое)
  const [alertProps, setAlertProps] = useState({
    variant: "success",
    title: "",
    subtitle: "",
  });

  const navigate = useNavigate();

  const { getCsrf, fetchUser, BACKEND } = useAuth();

  // вспомогательная функция; открывает Alert с нужными текстами
  const showAlert = ({ variant = "success", title = "", subtitle = "" }) => {
    setAlertProps({ variant, title, subtitle });
    setAlertOpen(true);
  };

  // валидация на клиенте
  // isValidName: минимум 2 буквы, только лат/кириллица и пробелы. (Регулярка /^[A-Za-zА-Яа-яЁё\s]{2,}$/)
  const isValidName = (name) => {
    if (!name) return false;
    const trimmed = name.trim();
    return /^[A-Za-zА-Яа-яЁё\s]{2,}$/.test(trimmed);
  };

  // isValidEmail: простая проверка email.
  const isValidEmail = (email) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // isValidPassword: проверяет минимальную длину 6. Клиентская валидация — UX-слой, но окончательно проверяет сервер
  const isValidPassword = (password) => {
    return typeof password === "string" && password.length >= 6;
  };

  // вспомогательная функция для обработки ошибок ответа сервера (формат Laravel)
  const handleResponseErrors = async (res) => {
    // парсит JSON ответ
    // если тело ответа не JSON или отсутствует, считать data = {} и продолжить логику обработки ошибок
    const data = await res.json().catch(() => ({}));
    //если есть data.errors (формат Laravel - т.е. объект{"errors":{"message":"..."}}..), нормализует их в простой объект и ставит первое сообщение(текстов ошибок по полям может быть несколько) в error
    if (data.errors && typeof data.errors === "object") {
      const flat = {};
      Object.entries(data.errors).forEach(([k, v]) => {
        flat[k] = Array.isArray(v) ? v[0] : String(v);
      });
      // сохраняет нормализованные полевые ошибки в состояние компонента, чтобы показывать их рядом с input'ами (formErrors.email и т.д.)
      setFormErrors(flat);
      // берётся первый ключ в объекте flat, это сообщение показывается в общем error-блоке над формой
      // если flat пустой (маловероятно при data.errors), используется data.message (н-р, "The given data was invalid") или дефолт "Validation error".
      setError(
        flat[Object.keys(flat)[0]] || data.message || "Validation error",
      );
      return true; // были ошибки
    }
    // если есть message -ставит его в error
    if (data.message) {
      setError(data.message);
      // возвращает true, если были обработанные ошибки (чтобы прервать дальнейшую логику).
      return true;
    }
    return false;
  };

  // логика входа (handleSubmit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    // очищает ошибки
    setError(null);
    setFormErrors({});

    // берёт email и password из формы, валидирует
    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;

    // Валидация
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password should be at least 6 characters.");
      return;
    }
    setLoading(true);

    // вызывает getCsrf()
    try {
      // ожидание получения CSRF cookie/token с бэка (важно для session-based POST)
      await getCsrf();
      const res = await fetch(`${BACKEND}/api/login`, {
        method: "POST",
        // отправляет cookies (важно для сессий)
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          // Laravel ожидает этот заголовок, когда используется Sanctum CSRF
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        // вызывает handleResponseErrors и прекращает выполнение
        const handled = await handleResponseErrors(res);
        if (handled) return;
        throw new Error("Login failed");
      }
      // парсит JSON (но не использует его), вызывает fetchUser() из контекста для обновления состояния пользователя
      await res.json().catch(() => null);
      await fetchUser();
      // показ уведомления об успехе
      showAlert({
        variant: "success",
        title: "Signed in",
        subtitle: "You have successfully signed in.",
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Login error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReg = async (e) => {
    e.preventDefault();
    setError(null);
    setFormErrors({});

    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const password_confirmation = form.confirmPassword.value;

    // Валидация
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

      await res.json().catch(() => null);
      await fetchUser();

      showAlert({
        variant: "success",
        title: "Registered",
        subtitle: "Welcome! You are now signed in.",
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration error");
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
      <div className="h-7 mb-4 text-center">
        {loading ? <div>Loading...</div> : null}
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
              className="block w-full text-center mb-3 mx-auto py-4 font-bold border rounded-sm  cursor-pointer bg-black text-white hover:bg-white hover:text-black"
              disabled={loading}
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
              onInput={clearErrorOnInput}
            />
            {formErrors.name && (
              <div className="text-red-500 text-sm mb-4">{formErrors.name}</div>
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
              className="block w-full text-center mb-3 mx-auto py-4 font-bold border rounded-sm  cursor-pointer bg-black text-white hover:bg-white hover:text-black"
              disabled={loading}
            >
              Register
            </button>
          </div>
        </form>
      )}

      {/* Alert */}
      <Alert
        variant={alertProps.variant}
        isOpen={alertOpen}
        title={alertProps.title}
        subtitle={alertProps.subtitle}
        onClose={() => {
          setAlertOpen(false);
          setTimeout(() => navigate("/"), 1000);
        }}
      />
    </div>
  );
};

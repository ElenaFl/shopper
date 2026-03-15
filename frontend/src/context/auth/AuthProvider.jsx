import React, { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext.jsx";
import { BACKEND } from "../../config/backend.js";

/**
 * AuthProvider - компонент-обёртка, предоставляет состояние и функции авторизации
 * через контекст AuthContext всем children.
 *
 * Value (в контексте) содержит:
 * - user           — объект текущего пользователя или null (если не авторизован)
 * - setUser        — сеттер для user (иногда удобно вызывать вручную)
 * - checking       — флаг загрузки при синхронизации user с сервером
 * - fetchUser      — синхронизировать/получить user с бэка (GET /api/user)
 * - getCsrf        — запрос CSRF cookie для Laravel Sanctum (/sanctum/csrf-cookie)
 * - login          — выполнить вход (POST /api/login)
 * - register       — выполнить регистрацию (POST /api/register)
 * - logout         — выполнить выход (POST /api/logout) и очистить клиентское состояние
 * - BACKEND        — базовый URL бекенда (из config)
 *
 * Замечания:
 * - Используется credentials: "include" для cookie-based (session) аутентификации (Laravel Sanctum).
 * - Заголовок X-XSRF-TOKEN ставится из cookie XSRF-TOKEN (getCookie), который устанавливает /sanctum/csrf-cookie.
 * - Обработку ошибок Laravel (validation) реализует handleResponseErrors — при ошибках бросает Error с полем formErrors.
 */

export const AuthProvider = ({ children }) => {
  // объект текущего пользователя (null, если неавторизован; user !== null → авторизован)
  const [user, setUser] = useState(null);
  // флаг, который показывает, выполняется ли сейчас проверка пользователя на стороне сервера.
  // true — "мы ещё не узнали, есть ли текущий залогиненный пользователь"; обычно используется для показа спиннера/placeholder.
  const [checking, setChecking] = useState(true);

  /**
   * getCsrf — запрос /sanctum/csrf-cookie (Laravel Sanctum)
   *
   * Браузер получит ответ, в котором сервер установит cookie XSRF-TOKEN (не HttpOnly).
   * После этого фронтенд может читать XSRF-TOKEN и отправлять его в заголовке X-XSRF-TOKEN при POST/PUT/DELETE.
   */
  const getCsrf = async () => {
    try {
      await fetch(`${BACKEND}/sanctum/csrf-cookie`, {
        method: "GET",
        credentials: "include",
      });
    } catch (err) {
      // Ошибку логируем, но оставляем обработку вызывающему коду.
      console.error("getCsrf error", err);
      throw err;
    }
  };

  /**
   * getCookie — вспомогательная функция для чтения не-HttpOnly cookie из document.cookie
   * (используется для чтения XSRF-TOKEN и установки заголовка X-XSRF-TOKEN).
   */
  const getCookie = (name) => {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)"),
    );
    return match ? decodeURIComponent(match[2]) : null;
  };

  /**
   * fetchUser — синхронизирует состояние user с бекендом (GET /api/user)
   *
   * keepLocal = true — в случае ошибки не затирает локальный user (полезно, если вы временно хотите сохранить state)
   * Возвращает объект user или null.
   */
  const fetchUser = async ({ keepLocal = false } = {}) => {
    try {
      setChecking(true);
      const res = await fetch(`${BACKEND}/api/user`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!res.ok) {
        // Если пришёл 401/403 и мы не хотим сохранять локальный user — очистим его.
        if (!keepLocal) {
          setUser(null);
        }
        return null;
      }

      const data = await res.json();
      setUser(data);
      return data;
    } catch (err) {
      console.error("fetchUser error", err);
      if (!keepLocal) {
        setUser(null);
      }
      return null;
    } finally {
      setChecking(false);
    }
  };

  // при монтировании провайдера — синхронизируем user (проверяем, есть ли активная сессия)
  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * handleResponseErrors — парсит JSON-ответы с ошибками в формате Laravel и бросает Error.
   * Если в ответе есть validation errors (data.errors), формирует поле err.formErrors = { field: message }.
   * Вызывающий код может ловить ошибку и показывать formErrors рядом с полями формы.
   */
  const handleResponseErrors = async (res) => {
    const data = await res.json().catch(() => ({}));
    if (data.errors && typeof data.errors === "object") {
      const flat = {};
      Object.entries(data.errors).forEach(([k, v]) => {
        flat[k] = Array.isArray(v) ? v[0] : String(v);
      });
      const err = new Error(
        flat[Object.keys(flat)[0]] || data.message || "Validation error",
      );
      err.formErrors = flat;
      throw err;
    }
    if (data.message) {
      throw new Error(data.message);
    }
    throw new Error("Request failed");
  };

  /**
   * login — вход пользователя
   * При успешном входе вызывает fetchUser() чтобы синхронизировать состояние.
   * Бросает ошибку (с возможным err.formErrors) при неуспехе.
   *
   * Параметры: { email, password }
   */
  const login = async ({ email, password }) => {
    await getCsrf(); // получаем XSRF cookie перед POST
    const res = await fetch(`${BACKEND}/api/login`, {
      method: "POST",
      credentials: "include", // важно для cookie-based аутентификации
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      await handleResponseErrors(res);
    }

    // обновим состояние user (GET /api/user)
    const serverUser = await fetchUser();
    return serverUser;
  };

  /**
   * register — регистрация пользователя
   * При успешной регистрации синхронизирует user через fetchUser().
   *
   * Параметры: { name, email, password, password_confirmation }
   */
  const register = async ({ name, email, password, password_confirmation }) => {
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
      await handleResponseErrors(res);
    }

    const serverUser = await fetchUser();
    return serverUser;
  };

  /**
   * logout — выход пользователя
   *
   * Алгоритм:
   * 1) getCsrf() — гарантируем наличие XSRF cookie
   * 2) POST /api/logout с credentials: "include" и X-XSRF-TOKEN
   * 3) Независимо от ответа сервера очищаем клиентский user (setUser(null))
   *
   * Примечание: на сервере маршрут /api/logout должен инвалидировать сессию и/или удалить токен.
   */
  const logout = async () => {
    try {
      console.log("AuthProvider.logout called");
      // Проверяем/получаем CSRF-cookie
      await getCsrf();

      console.log("AuthProvider.logout: got CSRF, about to fetch /api/logout");
      console.log("AuthProvider.logout: about to call fetch /api/logout");
      // Если getCsrf не используется в вашей среде, поставьте лог и перед fetch:
      // console.log("AuthProvider.logout: calling fetch /api/logout");
      let res;
      try {
        res = await fetch(`${BACKEND}/api/logout`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
          },
        });
        console.log(
          "AuthProvider.logout: fetch completed, status =",
          res.status,
        );
      } catch (fetchErr) {
        console.error("AuthProvider.logout: fetch threw error", fetchErr);
        throw fetchErr;
      }

      if (!res.ok) {
        // Попытка распарсить тело ошибки для диагностики (но даже при ошибке очищаем состояние)
        try {
          const data = await res.json();
          console.error("Logout failed:", data);
        } catch (err) {
          // используем err для логирования, чтобы ESLint не ругался на неиспользуемую переменную
          console.error("Logout failed (no json)", err);
        }
      }
    } catch (err) {
      console.error("logout error", err);
    } finally {
      // Всегда очищаем клиентское состояние пользователя.
      setUser(null);
      // Здесь при необходимости можно очистить localStorage, корзину и т.д.
    }
  };

  // Контекст, который получат потребители через useAuth()
  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        checking,
        fetchUser,
        getCsrf,
        BACKEND,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

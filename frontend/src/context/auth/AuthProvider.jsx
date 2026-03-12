import React, { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext.jsx";
import { BACKEND } from "../../config/backend.js";

/**
 *
 * AuthProvider - компонент-обёртка, предоставляет состояние и функции авторизации через контекст AuthContext всем children
 */

export const AuthProvider = ({ children }) => {
  //объект текущего пользователя (null, если неавторизован; user !== null → авторизован)
  const [user, setUser] = useState(null);
  //флаг, который показывает, выполняется ли сейчас проверка пользователя на стороне сервера.
  //true — "мы ещё не узнали, есть ли такой пользователь/может ли он быть зарегистрирован"; показ-ся индикатор загрузки.
  const [checking, setChecking] = useState(true);

  //асинхр стрел ф-я(получить csrf-токен) отправляет GET-запрос на ${BACKEND}/sanctum/csrf-cookie с указанием credentials: "include"
  //браузер получает ответ от сервера, в котором сервер устанавливает cookie: XSRF-TOKEN
  //после успешного вызова в документе cookie для домена backend появляется XSRF-TOKEN. этот токен потом читается фронтендом и ставится в заголовок X-XSRF-TOKEN при POST/PUT/DELETE запросах
  const getCsrf = async () => {
    try {
      await fetch(`${BACKEND}/sanctum/csrf-cookie`, {
        method: "GET",
        credentials: "include",
      });
    } catch (err) {
      // ignore — handled in callers
      console.error(err);
    }
  };

  //асинхр стрел ф-я(извлечь пользователя) выполняет GET по пути /api/user с опцией credentials: "include" (чтобы браузер при этом запросе отправил cookie).
  //если ответ не ok (н-р, 401) — сбрасывает user в null.
  //при успешном ответе парсит JSON и сохраняет данные в состоянии(useState) - user.
  const fetchUser = async () => {
    try {
      setChecking(true);
      const res = await fetch(`${BACKEND}/api/user`, {
        credentials: "include",
      });
      if (!res.ok) {
        setUser(null);
        return null;
      }
      //парсит JSON‑строку в JS‑объект
      const data = await res.json();
      //сохраняет данные в ({id: 5, name: "Иван", email: "ivan@ivan.ru", ..}) в состоянии user
      setUser(data);
      return data;
    } catch (err) {
      console.error(err);
      setUser(null);
      return null;
    } finally {
      //проверка пользователя завершена(независимо от результата: авторизован или нет)
      setChecking(false);
    }
  };

  //при загрузке приложения (когда AuthProvider только монтируется) происходит автоматическая проверка, залогинен ли пользователь
  useEffect(() => {
    // функция, которую React выполнит только один раз, после того, как компонент впервые отрендерится в DOM(узнаем при старте приложения, есть ли текущий залогиненый пользователь)
    fetchUser();
  }, []);

  return (
    // вся часть приложения, находящаяся внутри <AuthProvider> ... </AuthProvider>, сможет вызвать useAuth() и получить user, fetchUser и т.д.
    <AuthContext.Provider
      value={{ user, setUser, checking, fetchUser, getCsrf, BACKEND }}
    >
      {children}
    </AuthContext.Provider>
  );
};

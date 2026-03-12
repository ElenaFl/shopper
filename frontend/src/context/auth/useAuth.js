import { useContext } from "react";
import { AuthContext } from "./AuthContext.jsx";

/**
 * useAuth — пользовательский хук.
 *
 * Предоставляет функциональность авторизации через контекст или локальное состояние.
 * Инкапсулирует логику работы с API аутентификации: получение CSRF, логина, регистрацию, получение текущего пользователя, logout, хранение/доступ к состоянию авторизации (user, loading, isAuthenticated и т.д.).
 */

export const useAuth = () => useContext(AuthContext);

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * AccountLogout — выполняет логаут и редиректит на главную.
 * Вставьте сюда логику очистки токенов/контекста.
 */
export const AccountLogout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: выполнить реальную логаут-логику: очистить токены, контексты, localStorage и т.д.
    // Пример:
    // auth.logout();
    // cartContext.clearCart();
    // localStorage.removeItem("auth_token");

    // затем редирект
    const t = setTimeout(() => {
      navigate("/", { replace: true });
    }, 600);

    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div>
      <h3 className="text-xl font-medium mb-4">You have been logged out</h3>
      <p>Redirecting to homepage…</p>
    </div>
  );
};
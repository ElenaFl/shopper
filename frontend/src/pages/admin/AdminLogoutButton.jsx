import React, { useState } from "react";
import { useAuth } from "../../context/auth/useAuth.js";
import { useNavigate } from "react-router-dom";

/**
 *
 * AdminLogoutButton - Кнопка выхода для админ-панели.
 * Вызывает logout из контекста аутентификации и перенаправляет пользователя на страницу /account.
 */

export const AdminLogoutButton = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      navigate("/account", { replace: true });
    } catch (err) {
      console.error("Logout failed", err);
      alert("Не удалось выйти. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="flex items-center gap-3 px-4 py-2 rounded-md shadow-md disabled:opacity-60"
        aria-disabled={loading}
      >
        {loading ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="4"
              />
              <path
                d="M22 12a10 10 0 00-10-10"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <span>Выход...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M16 17l5-5-5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 12H9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13 19H6a2 2 0 01-2-2V7a2 2 0 012-2h7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Log out of Admin</span>
          </>
        )}
      </button>
    </div>
  );
};

export default AdminLogoutButton;

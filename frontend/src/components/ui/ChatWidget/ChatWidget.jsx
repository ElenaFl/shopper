import React, { useEffect, useState } from "react";

/**
 * ChatWidget — минимально рабочий чат для вашего проекта
 * Требует работающие backend маршруты:
 *  POST /api/chat/sessions
 *  POST /api/chat/send
 * Оба маршрута должны принимать cookie‑based auth (sanctum) или быть публичными для теста.
 */

export default function ChatWidget() {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]); // {role, content}
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Получить CSRF cookie (Sanctum)
  const ensureCsrf = async () => {
    try {
      await fetch("http://shopper.local/sanctum/csrf-cookie", {
        credentials: "include",
      });
      const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
      console.warn("ensureCsrf failed", e);
      return null;
    }
  };

  // Создать сессию на бэкенде
  const createSession = async () => {
    const xsrf = await ensureCsrf();
    const res = await fetch("http://shopper.local/api/chat/sessions", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
      },
      body: null,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => null);
      throw new Error("Failed create session" + (txt ? ": " + txt : ""));
    }
    return await res.json();
  };

  // Отправить сообщение и получить ответ
  const send = async (text) => {
    setError(null);
    setSending(true);
    try {
      let s = session;
      if (!s) {
        s = await createSession();
        setSession(s);
      }

      // Покажем сообщение пользователя локально
      setMessages((m) => [...m, { role: "user", content: text }]);

      const xsrf = await ensureCsrf();
      const res = await fetch("http://shopper.local/api/chat/send", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
        },
        body: JSON.stringify({ session_id: s.id, content: text }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error("Send failed" + (txt ? ": " + txt : ""));
      }

      const data = await res.json();
      const replyText =
        data && data.reply && data.reply.content
          ? data.reply.content
          : JSON.stringify(data.reply) || "";
      setMessages((m) => [...m, { role: "assistant", content: replyText }]);
    } catch (e) {
      console.error(e);
      setError(e.message || "Send error");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!value.trim()) return;
    await send(value.trim());
    setValue("");
  };

  return (
    <div className="max-w-2xl mx-auto p-4 border rounded shadow bg-white">
      <h3 className="text-lg font-medium mb-3">Чат с ботом</h3>

      <div className="mb-3 h-48 overflow-auto p-2 border rounded">
        {messages.length === 0 ? (
          <div className="text-sm text-gray-500">Начните разговор...</div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`mb-2 ${m.role === "user" ? "text-right" : "text-left"}`}
            >
              <div
                className={`${m.role === "user" ? "inline-block bg-gray-200 text-black" : "inline-block bg-[#F3F3F3] text-black"} px-3 py-2 rounded`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 border px-3 py-2 rounded"
          placeholder="Напишите сообщение..."
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending}
          className="px-4 py-2 bg-black text-white rounded"
        >
          {sending ? "..." : "Отправить"}
        </button>
      </form>
    </div>
  );
}

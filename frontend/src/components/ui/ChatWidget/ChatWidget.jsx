import React, { useEffect, useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";
const API_GET = `${API_BASE}/api/chat/widget-state`;
const API_SET = `${API_BASE}/api/chat/widget-state`;
const API_SESSIONS = `${API_BASE}/api/chat/sessions`;
const API_SEND = `${API_BASE}/api/chat/send`;
const SANCTUM = `${API_BASE}/sanctum/csrf-cookie`;

/**
  Production-ready ChatWidget:
  - session lifecycle via POST /api/chat/sessions
  - send messages with { session_id, content } to POST /api/chat/send
  - load widget-state and history from GET /api/chat/widget-state
  - robust normalization & safe rendering of server responses
  - visual diadem and styles
*/

export const ChatWidget = () => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [visible, setVisible] = useState(false);

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]); // { role, content }
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [diademVisible, setDiademVisible] = useState(false);

  const mountedRef = useRef(false);
  const scrollRef = useRef(null);
  const diademTimerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    initWidget();
    return () => {
      mountedRef.current = false;
      clearTimeout(diademTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, visible]);

  async function fetchSanctumCsrf() {
    try {
      await fetch(SANCTUM, { credentials: "include" });
      const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
      return null;
    }
  }

  async function initWidget() {
    try {
      const res = await fetch(API_GET, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!mountedRef.current) return;
      if (res.status === 401) {
        setEnabled(false);
        setHidden(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setEnabled(Boolean(data.enabled));
      setHidden(Boolean(data.hidden));
      setLoading(false);

      // restore history if present
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages.map(normalizeServerMessage));
      } else if (Array.isArray(data.history) && data.history.length > 0) {
        setMessages(data.history.map(normalizeServerMessage));
      }

      if (data.enabled && !data.hidden) {
        setTimeout(() => {
          if (!mountedRef.current) return;
          setVisible(true);
          clearTimeout(diademTimerRef.current);
          diademTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setDiademVisible(true);
          }, 160);
        }, 50);
      }
    } catch (e) {
      console.error("initWidget failed", e);
      setLoading(false);
    }
  }

  // normalize server message -> { role, content } with content string
  function normalizeServerMessage(msg) {
    if (typeof msg === "string") return { role: "assistant", content: msg };
    if (!msg || typeof msg !== "object")
      return { role: "assistant", content: String(msg ?? "") };

    const role = msg.role ?? "assistant";
    let content = msg.content ?? msg.reply ?? msg.text ?? "";

    if (Array.isArray(content)) {
      content = content
        .map((c) => (typeof c === "string" ? c : JSON.stringify(c)))
        .join("\n");
    } else if (typeof content === "object") {
      content = JSON.stringify(content);
    } else if (content == null) {
      content = "";
    } else {
      content = String(content);
    }

    return { role, content };
  }

  function renderContent(content) {
    if (content == null) return "";
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((c, i) =>
        typeof c === "string" ? (
          <div key={i}>{c}</div>
        ) : (
          <pre key={i}>{JSON.stringify(c)}</pre>
        ),
      );
    }
    return <pre>{JSON.stringify(content)}</pre>;
  }

  // create session on server (stores in state)
  async function createSession() {
    try {
      const xsrf = await fetchSanctumCsrf();
      const res = await fetch(API_SESSIONS, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
          Accept: "application/json",
        },
        body: null,
      });
      if (!res.ok) {
        throw new Error("Failed to create session: " + res.status);
      }
      const data = await res.json();
      setSession(data);
      return data;
    } catch (e) {
      console.error("createSession failed", e);
      throw e;
    }
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      if (!session) {
        await createSession();
      }

      await fetchSanctumCsrf();
      const xsrf = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1];

      const res = await fetch(API_SEND, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(xsrf ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) } : {}),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          session_id: session?.id ?? null,
          content: text,
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => null);
        console.error("chat send failed", res.status, err);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Ошибка отправки сообщения." },
        ]);
        setSending(false);
        return;
      }

      const data = await res.json();
      const toInsert = [];
      if (data.reply) toInsert.push(normalizeServerMessage(data.reply));
      if (data.content)
        toInsert.push(
          normalizeServerMessage({
            content: data.content,
            role: data.role ?? "assistant",
          }),
        );
      if (Array.isArray(data.messages))
        data.messages.forEach((msg) =>
          toInsert.push(normalizeServerMessage(msg)),
        );
      if (
        data &&
        !Array.isArray(data) &&
        data.content &&
        !data.messages &&
        !data.reply
      )
        toInsert.push(normalizeServerMessage(data));

      if (toInsert.length === 0)
        toInsert.push({
          role: "assistant",
          content: "Пустой ответ от сервера.",
        });

      setMessages((m) => [...m, ...toInsert]);
      setSending(false);
    } catch (e) {
      console.error("handleSend error", e);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Сервис недоступен — попробуйте позже." },
      ]);
      setSending(false);
    }
  }

  const handleClose = async () => {
    setDiademVisible(false);
    setVisible(false);
    setTimeout(() => setHidden(true), 260);
    try {
      await fetchSanctumCsrf();
      const xsrf = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1];
      await fetch(API_SET, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(xsrf ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) } : {}),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ hidden: true }),
      });
    } catch (e) {
      console.error("set hidden failed", e);
    }
  };

  const handleOpen = async () => {
    setHidden(false);
    setTimeout(() => {
      setVisible(true);
      clearTimeout(diademTimerRef.current);
      diademTimerRef.current = setTimeout(() => setDiademVisible(true), 160);
    }, 20);
    try {
      await fetchSanctumCsrf();
      const xsrf = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1];
      await fetch(API_SET, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(xsrf ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) } : {}),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ hidden: false }),
      });
    } catch (e) {
      console.error("set hidden failed", e);
    }
  };

  if (loading) return null;
  if (!enabled) return null;

  return (
    <>
      {hidden && (
        <button
          onClick={handleOpen}
          aria-label="Open chat"
          className="fixed right-6 bottom-6 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg"
          style={{
            background: "#7D7D7D",
            color: "#fff",
            backdropFilter: "blur(4px)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            transform: "translateY(0) scale(1)",
            transition:
              "transform 240ms cubic-bezier(.2,.9,.3,1), opacity 200ms ease",
            opacity: 1,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="inline-block"
          >
            <path d="M21 12a9 9 0 1 1-3-6.5L21 12z" fill="#fff" opacity="0.9" />
          </svg>
          <span className="text-sm font-medium">Чат</span>
        </button>
      )}

      <div
        className="fixed"
        style={{
          right: 50,
          bottom: 24,
          zIndex: 40,
          width: 300,
          maxWidth: "calc(100% - 32px)",
        }}
      >
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            transformOrigin: "bottom right",
            backdropFilter: "blur(8px)",
            background: "rgba(211,211,211,0)",
            border: `1px solid rgba(161,138,104,0.16)`,
            boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
            transition:
              "transform 560ms cubic-bezier(0.16,0.84,0.24,1), opacity 480ms ease, box-shadow 300ms ease",
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(20px) scale(0.994)",
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? "auto" : "none",
          }}
        >
          {/* Diadem (tiara) */}
          <div
            style={{
              position: "relative",
              width: 120,
              height: 28,
              marginLeft: 35,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              transform: diademVisible
                ? "translateY(16px)"
                : "translateY(10px)",
              transition:
                "opacity 360ms ease, transform 360ms cubic-bezier(.2,.9,.3,1)",
              opacity: diademVisible ? 1 : 0,
            }}
          >
            <img
              src="/images/tiara.png"
              alt="diadem"
              style={{
                width: 120,
                height: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.12))",
                opacity: 0.98,
                display: "block",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                display: "block",
                pointerEvents: "none",
                overflow: "visible",
              }}
              className="tiara-sparkles"
            >
              {/* Inline SVG sparkles */}
              <svg
                width="120"
                height="28"
                viewBox="0 0 120 28"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: "100%", height: "100%" }}
              >
                <defs>
                  <linearGradient id="sheenGrad" x1="0" x2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.65)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                  </linearGradient>
                  <radialGradient id="spark" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                  </radialGradient>
                </defs>
                <circle
                  cx="28"
                  cy="8"
                  r="1.6"
                  fill="url(#spark)"
                  opacity="0.9"
                />
                <circle
                  cx="46"
                  cy="6"
                  r="1.2"
                  fill="url(#spark)"
                  opacity="0.85"
                />
                <circle
                  cx="72"
                  cy="10"
                  r="1.8"
                  fill="url(#spark)"
                  opacity="0.9"
                />
                <circle
                  cx="96"
                  cy="7"
                  r="1.2"
                  fill="url(#spark)"
                  opacity="0.8"
                />
                <rect
                  className="sheen"
                  x="-40"
                  y="-6"
                  width="60"
                  height="40"
                  fill="url(#sheenGrad)"
                  opacity="0.32"
                  rx="6"
                />
              </svg>
            </div>
          </div>

          {/* Header */}
          <div className="pt-8 px-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "#7D7D7D",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                AI
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#222" }}>
                  Support
                </div>
                <div style={{ fontSize: 12, color: "#444" }}>Онлайн</div>
              </div>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="p-2 cursor-pointer"
              style={{ color: "#6b6b6b" }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="px-4 pb-3"
            style={{ height: 220, overflowY: "auto", paddingTop: 6 }}
          >
            {messages.length === 0 ? (
              <div className="text-sm text-gray-600">
                Начните разговор — я помогу с заказом и товарами.
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className="mb-2 flex"
                  style={{
                    justifyContent:
                      m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "78%",
                      padding: "8px 12px",
                      borderRadius: 12,
                      background:
                        m.role === "user"
                          ? "rgba(161,138,104,0.95)"
                          : "rgba(255,255,255,0.9)",
                      color: m.role === "user" ? "#fff" : "#222",
                      boxShadow:
                        m.role === "user"
                          ? "0 4px 10px rgba(161,138,104,0.08)"
                          : "none",
                    }}
                  >
                    <div style={{ fontSize: 14, lineHeight: 1.3 }}>
                      {renderContent(m.content)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div
            className="px-3 py-3 border-t"
            style={{ borderColor: "rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-md text-sm"
                placeholder="Напишите сообщение..."
                style={{
                  border: "1px solid rgba(0,0,0,0.06)",
                  outline: "none",
                  background: "rgba(255,255,255,0.78)",
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending}
                className="py-1.5 rounded-md"
                style={{
                  background: "#7D7D7D",
                  color: "#fff",
                  fontWeight: 500,
                  fontSize: 13,
                  minWidth: 72,
                  boxShadow: "0 6px 14px rgba(161,138,104,0.12)",
                }}
              >
                {sending ? "..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

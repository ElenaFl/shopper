import React, { useEffect, useState, useRef } from "react";

const GOLD = "#A18A68";
const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";
const API_GET = `${API_BASE}/api/chat/widget-state`;
const API_SET = `${API_BASE}/api/chat/widget-state`;
const SANCTUM = `${API_BASE}/sanctum/csrf-cookie`;

export default function ChatWidget() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const mountedRef = useRef(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    fetchWidgetState();
    return () => {
      mountedRef.current = false;
    };
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

  async function fetchWidgetState() {
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
      if (data.enabled && !data.hidden) setTimeout(() => setVisible(true), 50);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function setWidgetHiddenState(val) {
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
        body: JSON.stringify({ hidden: !!val }),
      });
    } catch (e) {
      console.error(e);
    }
  }

  const handleClose = async () => {
    setVisible(false);
    setTimeout(() => setHidden(true), 260);
    await setWidgetHiddenState(true);
  };
  const handleOpen = async () => {
    setHidden(false);
    setVisible(true);
    await setWidgetHiddenState(false);
  };

  // placeholder send
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      await fetchSanctumCsrf();
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Спасибо! Ваше сообщение получено." },
        ]);
        setSending(false);
      }, 700);
    } catch (e) {
      console.error(e);
      setSending(false);
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
            background: "rgba(161,138,104,0.95)",
            color: "#fff",
            backdropFilter: "blur(4px)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            transform: hidden
              ? "translateY(0) scale(1)"
              : "translateY(0) scale(1.02)",
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

      {/* Widget */}
      <div
        className="fixed right-6 bottom-6 z-40"
        style={{ width: 300, maxWidth: "calc(100% - 32px)" }}
      >
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            transformOrigin: "bottom right",
            backdropFilter: "blur(8px)",
            background: "rgba(255,255,255,0.65)",
            border: "1px solid rgba(161,138,104,0.16)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
            transition:
              "transform 560ms cubic-bezier(0.16, 0.84, 0.24, 1), opacity 480ms ease, box-shadow 300ms ease",
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(20px) scale(0.994)",
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? "auto" : "none",
          }}
        >
          {/* Diadem (bigger & clearer) */}

          <div
            style={{
              position: "relative",
              width: 120,
              height: 28,
              marginLeft: 35, // сдвигаем правее
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              transform: "translateY(16px)", // опускаем вниз
            }}
          >
            <img
              src="/images/tiara.png"
              alt=""
              style={{
                width: "120px",
                height: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.12))",
                opacity: 0.98,
                display: "block",
              }}
            />
          </div>

          {/* Header */}
          <div className="pt-8 px-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: GOLD,
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
                <div style={{ fontSize: 14, fontWeight: 600 }}>Support</div>
                <div style={{ fontSize: 12, color: "#6b6b6b" }}>Онлайн</div>
              </div>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="p-2"
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
                      {m.content}
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
                  background: GOLD,
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
}

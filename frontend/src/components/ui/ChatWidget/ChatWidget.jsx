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

  // chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // diadem visibility (separate state for delayed appearance)
  const [diademVisible, setDiademVisible] = useState(false);

  const mountedRef = useRef(false);
  const scrollRef = useRef(null);
  const diademTimerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    fetchWidgetState();
    return () => {
      mountedRef.current = false;
      clearTimeout(diademTimerRef.current);
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

      if (data.enabled && !data.hidden) {
        // show widget, then diadem with delay
        setTimeout(() => {
          if (!mountedRef.current) return;
          setVisible(true);
          clearTimeout(diademTimerRef.current);
          diademTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setDiademVisible(true);
          }, 160); // diadem delay
        }, 50); // small initial delay
      }
    } catch (e) {
      console.error("ChatWidget getState failed", e);
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
      console.error("ChatWidget setState failed", e);
    }
  }

  const handleClose = async () => {
    // hide diadem immediately for clean exit
    setDiademVisible(false);
    // animate container hide
    setVisible(false);
    // after animation finish, mark hidden and persist
    setTimeout(() => setHidden(true), 260);
    await setWidgetHiddenState(true);
  };

  const handleOpen = async () => {
    setHidden(false);
    // small delay before showing container to allow layout changes
    setTimeout(() => {
      setVisible(true);
      clearTimeout(diademTimerRef.current);
      diademTimerRef.current = setTimeout(() => setDiademVisible(true), 160);
    }, 20);
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
      // simulate assistant reply
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
      {/* open button (shown when widget hidden) */}
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

      {/* Widget container */}
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
          {/* Diadem */}
          {/* <div
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
          </div> */}

          {/* Diadem container with subtle sparkle overlay */}

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
            className="chat-widget__tiara tiara-sparkles"
          >
            {" "}
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
}
